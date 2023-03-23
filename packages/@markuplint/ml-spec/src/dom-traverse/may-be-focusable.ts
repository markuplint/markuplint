import type { MLMLSpec } from '../types';
import type { ReadonlyDeep } from 'type-fest';

import { getSelectorsByContentModelCategory } from '../specs/get-selectors-by-content-model-category';

export function mayBeFocusable(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: ReadonlyDeep<MLMLSpec>,
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
