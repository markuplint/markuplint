/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types -- AccnameElement wraps mutable DOM types */

import type { AccnameElement } from './types.js';

/**
 * Checks whether an SVG element has any accessible name source, without performing
 * the full name computation.
 *
 * Used by `get-computed-role.ts` for SVG accessibility tree inclusion decisions
 * per SVG-AAM §5.1.1. This is a lightweight check that avoids the full AccName
 * algorithm, breaking the circular dependency between role computation and
 * name computation.
 *
 * Checks (in order): `aria-label`, `aria-labelledby`, `<title>` child, `<desc>` child.
 *
 * @param el - The SVG element to check for accessible name sources
 * @returns True if the element has aria-label, aria-labelledby, or a title/desc child
 * @see https://www.w3.org/TR/svg-aam-1.0/#include_elements — SVG-AAM §5.1.1
 */
export function hasSvgAccessibleNameSource(el: AccnameElement): boolean {
	if (el.getAttribute('aria-label')?.trim()) {
		return true;
	}
	if (el.getAttribute('aria-labelledby')?.trim()) {
		return true;
	}
	for (const child of el.children) {
		if ((child.localName === 'title' || child.localName === 'desc') && child.textContent?.trim()) {
			return true;
		}
	}
	return false;
}
