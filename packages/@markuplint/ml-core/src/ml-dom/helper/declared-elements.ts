import type { MLElement } from '../node/element.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

/**
 * @module
 *
 * The elements that a pretender declares (the slot wrappers and the static entries of `contents`)
 * are rendered by the component, so they are elements of the tree the component is in. They are
 * virtual: `MLElement` makes them, and they are in no `nodeList`, so a walk of the syntax tree does
 * not meet them. What looks the tree up by an element reads them here (`MLParentNode#elementsInTreeOrder`, which
 * `getElementById` and the ownership of `aria-owns` of `@markuplint/ml-spec` read), in the order the
 * component renders them: right after the pretended element, and for what comes after the
 * children given at the usage site (`PretenderSlotContent#declared`), after the last descendant
 * of the pretended element.
 *
 * The parent of a virtual element is the pretended element, or the virtual slot wrapper that it is in,
 * whose parent is the pretended element; so the syntactical parents of it lead to the pretended
 * element, and `getRootNode()` of it is the tree of the pretended element.
 */

/**
 * The elements a pretender declares, split at the children given at the usage site.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param el - An element
 * @returns The elements, or `null` when `el` is not a pretender that declares any, or has a declarative
 *   shadow root attached: that is rendered in their place
 */
export function getPretenderDeclaredElements<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<T, O>,
): { readonly before: readonly MLElement<T, O>[]; readonly after: readonly MLElement<T, O>[] } | null {
	const context = el.pretenderContext;
	if (context?.type !== 'pretender' || !context.slotContent || el.declarativeShadowRoot) {
		return null;
	}
	const { before, after } = context.slotContent.declared;
	return before.length > 0 || after.length > 0 ? { before, after } : null;
}

/**
 * Whether the element is one that a pretender declares: a slot wrapper or an entry of `contents`, which
 * `MLElement` made and which is in no `nodeList`. What it holds is not declared, so its children and its
 * text are not known: it is childless as made. The pretender element `as` of the pretended element is not one.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param el - An element
 * @returns `true` if the element is declared by a pretender
 */
export function isPretenderDeclaredElement<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<T, O>,
): boolean {
	const context = el.pretenderContext;
	return context?.type === 'origin' && context.declared === true;
}

/**
 * The elements with those that the pretenders among them declare put in, in the order of the tree.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @param elements - Elements in the order of the markup
 * @returns The elements of the markup, and the declared elements of each pretender among them
 */
export function withPretenderDeclaredElements<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	elements: Iterable<MLElement<T, O>>,
): MLElement<T, O>[] {
	const result: MLElement<T, O>[] = [];
	// The pretenders whose children are being walked, innermost last, with what comes after them
	const open: { readonly host: MLElement<T, O>; readonly after: readonly MLElement<T, O>[] }[] = [];

	const close = (until?: MLElement<T, O>) => {
		for (let top = open.at(-1); top; top = open.at(-1)) {
			if (until && isDescendantOf(until, top.host)) {
				return;
			}
			result.push(...top.after);
			open.pop();
		}
	};

	for (const el of elements) {
		close(el);
		result.push(el);
		const declared = getPretenderDeclaredElements(el);
		if (declared) {
			result.push(...declared.before);
			if (declared.after.length > 0) {
				open.push({ host: el, after: declared.after });
			}
		}
	}
	close();

	return result;
}

/**
 * Whether `host` is an ancestor of `el`. It follows the syntactical parents, through what an HTML
 * `template` element holds as well, which `contains()` stops at.
 */
function isDescendantOf<T extends RuleConfigValue, O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: MLElement<T, O>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	host: MLElement<T, O>,
): boolean {
	let ancestor = el.syntacticalParentNode;
	while (ancestor && !ancestor.is(ancestor.DOCUMENT_NODE)) {
		if (ancestor === host) {
			return true;
		}
		ancestor = ancestor.syntacticalParentNode;
	}
	return false;
}
