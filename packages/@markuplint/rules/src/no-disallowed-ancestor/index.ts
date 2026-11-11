import type { PlainData } from '@markuplint/ml-config';
import type { Element, RuleConfigValue } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';
import { getSpecByTagName } from '@markuplint/ml-spec';

import { isRenderedAway } from '../helpers.js';

import meta from './meta.js';

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
 * Known limitation: `:aria(has no name)` in an entry reads a dynamic value of `aria-label` or
 * `title` as a name, as the accessible name computation does, so `<form aria-label={x}><main>`
 * is reported although `x` may be empty at runtime and the form then has no name.
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
				if (
					forbiddenAncestors.some(selector => current.matches(selector)) ||
					(permittedAncestors && !matchesPermitted(current, permittedAncestors))
				) {
					report({
						scope: el,
						message: t(
							'{0} must not appear as a descendant of {1}',
							t('the "{0}" {1}', el.localName, 'element'),
							t('the "{0}" {1}', ancestor.localName, 'element'),
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
 *   `templateContent` of its spec) is an `element` below: the children are in the document.
 * - `transparent`: a node that is not an element of the document ({@link isRenderedAway}), which
 *   the walk skips as if it were not there and does not judge.
 * - `element`: any other element.
 *
 * @see https://html.spec.whatwg.org/multipage/scripting.html#the-template-element
 */
function getAncestorKind<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	ancestor: Element<T, O>,
): 'template-content' | 'transparent' | 'element' {
	if (isRenderedAway(ancestor)) {
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
	selectors: readonly string[],
): boolean {
	return selectors.some(selector => (selector === '#custom' ? ancestor.isCustomElement : ancestor.matches(selector)));
}
