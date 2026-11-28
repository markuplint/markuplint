import type { PlainData } from '@markuplint/ml-config';
import type { Element, RuleConfigValue } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION, getSpecByTagName } from '@markuplint/ml-spec';

import meta from './meta.js';

import { hasText } from '@markuplint/shared';

/**
 * Checks the ancestors of an element against its content model, which holds them in two forms
 * that this rule reads together: `forbiddenAncestors` (a deny list, any one match is a violation)
 * and `permittedAncestors` (an allow list, an ancestor that matches none is a violation).
 * The walk goes up from the parent and reports the nearest ancestor that violates, once.
 *
 * It does not enter the content of a `template` element, and it does not judge a node that is not
 * an element of the document (a fragment, a `template` that a template engine drops): see
 * {@link getAncestorKind}.
 *
 * An entry that uses `:aria(has no name)` or `:aria(has name)` is judged by the name of the ancestor.
 * Where the name is not known until it is rendered (a dynamic `aria-label` or `title`, an
 * `aria-labelledby` that may refer to an element the markup does not tell, a name in a branch of a
 * conditional block), the ancestor may have a name or not, and markuplint does not decide what it
 * cannot know: an entry of `permittedAncestors` matches it when it matches under either reading, and
 * an entry of `forbiddenAncestors` when it matches under both. So `<form aria-label={x}><main>` and
 * `<form aria-labelledby={id}><main>` are not reported, as `x` or the element of `id` may be empty at
 * runtime and the form then has no name.
 */
export default createRule({
	meta: meta,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const contentModel = getSpecByTagName(document.specs.specs, el.localName, el.namespaceURI)?.contentModel;
			const forbiddenAncestors = contentModel?.forbiddenAncestors ?? [];
			const permittedAncestors = contentModel?.permittedAncestors;
			if (forbiddenAncestors.length === 0 && !permittedAncestors) {
				return;
			}
			// The name of an ancestor is computed only for an element whose entries ask for it
			const asksName = [...forbiddenAncestors, ...(permittedAncestors ?? [])].some(selector =>
				/:aria\(/i.test(selector),
			);
			let ancestor = el.parentElement;
			while (ancestor) {
				const kind = getAncestorKind(ancestor);
				if (kind === 'template-content') {
					break;
				}
				if (kind === 'transparent') {
					ancestor = ancestor.parentElement;
					continue;
				}
				const current = ancestor;
				const reads = asksName ? readingsOfName(current) : [asIs];
				if (
					forbiddenAncestors.some(selector => reads.every(read => current.matches(read(selector)))) ||
					(permittedAncestors &&
						!permittedAncestors.some(selector =>
							reads.some(read => matchesPermitted(current, read(selector))),
						))
				) {
					report({
						scope: el,
						message: t(
							'{0} must not appear as a descendant of {1}',
							t('the "{0*}" {1}', el.localName, 'element'),
							t('the "{0*}" {1}', ancestor.localName, 'element'),
						),
					});
					break;
				}
				ancestor = ancestor.parentElement;
			}
		});
	},
});

/**
 * What `ancestor` is for the walk up the tree.
 *
 * - `template-content`: an HTML `template` element (`isHTMLTemplateElement`). The elements in its
 *   content belong to a separate `DocumentFragment`, so they have no ancestors in the document:
 *   `<section><template><main></main></template></section>` has a `main` element with none.
 *   markuplint holds the content as children of the `template` element, so the walk stops here.
 *   A `template` of a framework that puts the children in the element itself (React, Vue: the
 *   `templateContent` of its spec or of its parser) is an `element` below: the children are in the document.
 * - `transparent`: a node that is not an element of the document (`MLElement#isRenderedAway`), which
 *   the walk skips as if it were not there and does not judge.
 * - `element`: any other element.
 *
 * @see https://html.spec.whatwg.org/multipage/scripting.html#the-template-element
 */
function getAncestorKind<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	ancestor: Element<T, O>,
): 'template-content' | 'transparent' | 'element' {
	if (ancestor.isRenderedAway) {
		return 'transparent';
	}
	return ancestor.isHTMLTemplateElement ? 'template-content' : 'element';
}

/**
 * Whether `ancestor` matches an entry of `permittedAncestors`.
 *
 * `#custom` is not a selector: the element decides it, as the `:model()` pseudo-class does
 * for the `#custom` of a content model category (`isCustomElement` follows the pretender).
 * It is read only here: in `forbiddenAncestors` every entry is a selector, so `#custom` there
 * is an id selector.
 */
function matchesPermitted<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	ancestor: Element<T, O>,
	selector: string,
): boolean {
	return selector === '#custom' ? ancestor.isCustomElement : ancestor.matches(selector);
}

const asIs = (selector: string) => selector;

/**
 * The ways to read an entry for the name of `ancestor`: as it is, and, when the name is not known until
 * it is rendered, with `:aria(has name)` and `:aria(has no name)` swapped, which is the other way the
 * name may turn out. An entry that does not ask for the name reads the same in both.
 *
 * @param ancestor - The element whose name an entry may ask for
 * @returns The functions that turn an entry into the entry as read
 */
function readingsOfName<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	ancestor: Element<T, O>,
): readonly ((selector: string) => string)[] {
	return isNameUnknown(ancestor) ? [asIs, swapNameQuery] : [asIs];
}

/**
 * Whether the name of `ancestor` is not known until it is rendered. It is when
 *
 * - the name is empty as written and may be in a branch of a conditional block or in an element that
 *   `aria-labelledby` refers to (`MLElement#mayHaveAccessibleName`, which a change to the sources of an
 *   unknown name goes to first), or
 * - `aria-label` is dynamic and `aria-labelledby` is not there to name the element first, or `title` is
 *   dynamic and neither of them is: the computation reads the value that is there as a name, and it may
 *   be empty at runtime.
 *
 * @param ancestor - The element whose name an entry may ask for
 * @returns `true` if the element may have a name or not
 */
function isNameUnknown<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	ancestor: Element<T, O>,
): boolean {
	const labelledby = ancestor.getAttributeNode('aria-labelledby');
	const label = ancestor.getAttributeNode('aria-label');
	if (!labelledby && label?.isDynamicValue) {
		return true;
	}
	if (!labelledby && !label && ancestor.getAttributeNode('title')?.isDynamicValue) {
		return true;
	}
	return (
		!hasText(ancestor.getAccessibleName(ARIA_RECOMMENDED_VERSION)) &&
		ancestor.mayHaveAccessibleName(ARIA_RECOMMENDED_VERSION)
	);
}

/**
 * Swaps `:aria(has name)` and `:aria(has no name)` of a selector, with or without a version
 * (`:aria(has name|1.2)`). It swaps every such query of the selector at once, so it reads an entry that
 * asks for the name once: that is what the entries of the content models are (`form:aria(has no name)`),
 * and an entry that combines two queries (`:not(:aria(has name))` with another) is read as its opposite,
 * not as each of the outcomes.
 */
function swapNameQuery(selector: string): string {
	return selector.replaceAll(/:aria\(\s*has\s+(no\s+)?name/gi, (_, no: string | undefined) =>
		no ? ':aria(has name' : ':aria(has no name',
	);
}
