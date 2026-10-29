/**
 * The result builders of the accessible name computation.
 *
 * A module of their own, not part of `helpers.ts`: `aria-steps.ts` builds
 * results, and `helpers.ts` runs Step 2B for an embedded control through
 * `aria-steps.ts`, so keeping them in `helpers.ts` would make the two import
 * each other.
 *
 * @module
 */

import type { AccnameResult, AccnameSource } from './types.js';

/**
 * Builds a result from a name, flattened; an empty name has no source.
 */
export function makeResult(name: string, source: AccnameSource | null): AccnameResult {
	const trimmed = flattenText(name);
	return {
		name: trimmed,
		source: trimmed ? source : null,
	};
}

/**
 * Makes a flat string: whitespace runs become a single space, and the ends are trimmed.
 *
 * @see https://w3c.github.io/accname/#terminology
 */
export function flattenText(text: string): string {
	return text.replaceAll(/\s+/g, ' ').trim();
}
