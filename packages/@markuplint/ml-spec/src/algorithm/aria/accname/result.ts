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

import { trimAsciiWhitespace } from '@markuplint/shared';

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
 * Makes a flat string: runs of ASCII white space (U+0009, U+000A, U+000C, U+000D, U+0020) become a
 * single space, and the ends are trimmed of it. The other white space, such as U+00A0, is a character
 * of the text and is kept.
 *
 * @see https://w3c.github.io/accname/#terminology
 * @see https://infra.spec.whatwg.org/#ascii-whitespace
 * @param text - A text as written
 * @returns The flat string
 */
export function flattenText(text: string): string {
	return trimAsciiWhitespace(text.replaceAll(/[\t\n\f\r ]+/g, ' '));
}
