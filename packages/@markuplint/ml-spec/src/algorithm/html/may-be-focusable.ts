import type { MLMLSpec } from '../../types/index.js';

import { getSelectorsByContentModelCategory } from './get-selectors-by-content-model-category.js';

/**
 * Determines whether an element may potentially be focusable, based on whether it matches
 * interactive content selectors, has a `tabindex` attribute, or has a `contenteditable`
 * attribute. This is a heuristic check that does not account for runtime state such as
 * `disabled` or `inert` attributes.
 *
 * @param el - The DOM element to check
 * @param specs - The full markup language specification containing interactive content definitions
 * @returns `true` if the element may be focusable
 */
export function mayBeFocusable(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
): boolean {
	return (
		[
			/**
			 * Interactive content
			 *
			 * @see  https://html.spec.whatwg.org/multipage/dom.html#interactive-content
			 */
			...getSelectorsByContentModelCategory(specs, '#interactive'),
			/**
			 * Interaction
			 *
			 * @see  https://html.spec.whatwg.org/multipage/interaction.html
			 */
			'[tabindex]',
			// An editing host: the True and the Plaintext-Only state (the empty value is the True state); an invalid value
			// is the Inherit state, which makes no editing host
			// @see https://html.spec.whatwg.org/multipage/interaction.html#attr-contenteditable
			'[contenteditable=""]',
			'[contenteditable="true" i]',
			'[contenteditable="plaintext-only" i]',
		].some(selector => el.matches(selector)) || hasDynamicContentEditable(el)
	);
}

/**
 * @param el - An element
 * @returns Whether its `contenteditable` is not known until it is rendered, which may make it an editing host
 */
function hasDynamicContentEditable(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
): boolean {
	const attr = el.getAttributeNode('contenteditable') as (Attr & { readonly isDynamicValue?: boolean }) | null;
	return !!attr?.isDynamicValue;
}
