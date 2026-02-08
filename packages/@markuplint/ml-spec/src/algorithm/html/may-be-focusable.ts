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
	return [
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
		'[contenteditable]:not([contenteditable="false" i])',
	].some(selector => el.matches(selector));
}
