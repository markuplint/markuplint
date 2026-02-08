// @ts-ignore
import { computeAccessibleName } from 'dom-accessibility-api';

/**
 * Computes the accessible name for an element using the WAI-ARIA accessible name computation algorithm.
 * Falls back to the placeholder attribute value for input elements when no accessible name is found.
 *
 * @param el - The DOM element to compute the accessible name for
 * @returns The computed accessible name string, or an empty string if none is found
 */
export function getAccname(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
): string {
	const name = computeAccessibleName(el);
	if (!name.trim() && el.nodeName === 'INPUT') {
		return el.getAttribute('placeholder')?.trim() ?? '';
	}
	return name;
}
