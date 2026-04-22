import type { CustomSyntaxChecker } from '../types.js';

import { log } from '../debug.js';
import { matched, unmatched } from '../match-result.js';

/**
 * Dummy base URL for resolving relative URLs.
 * Used only for syntax validation — the actual base URL is irrelevant.
 * Matches the approach used by nu-html-checker (galimatias).
 */
const DUMMY_BASE = 'http://example.org/foo/bar';

/**
 * Characters that are illegal in URLs per WHATWG URL Standard.
 * Tabs and newlines are stripped during parsing but are validation errors.
 *
 * @see https://url.spec.whatwg.org/#url-code-points
 */
// eslint-disable-next-line no-control-regex
const ILLEGAL_WHITESPACE = /[\t\n\r]/;

/**
 * Malformed percent-encoding: `%` not followed by exactly two hex digits.
 */
const MALFORMED_PERCENT = /%(?![0-9A-F]{2})/i;

/**
 * Forbidden code points per HTML Living Standard and URL spec.
 *
 * Covers:
 * - C0 controls (U+0000–U+001F) except TAB/LF/CR which are caught by
 *   ILLEGAL_WHITESPACE
 * - DEL (U+007F) and C1 controls (U+0080–U+009F)
 * - Unicode noncharacters:
 *   - BMP: U+FDD0–U+FDEF, U+FFFE, U+FFFF
 *   - Supplementary planes: U+XFFFE / U+XFFFF for X = 1..10 (hex)
 *
 * Requires the `u` flag for code points above U+FFFF.
 *
 * @see https://infra.spec.whatwg.org/#noncharacter
 * @see https://html.spec.whatwg.org/multipage/parsing.html#preprocessing-the-input-stream
 */
const FORBIDDEN_CODE_POINT =
	// eslint-disable-next-line no-control-regex
	/[\u0000-\u0008\v\u000E-\u001F\u007F-\u009F\uFDD0-\uFDEF\uFFFE\uFFFF\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;

/**
 * Strips only HTML ASCII whitespace (TAB/LF/FF/CR/SPACE) from both ends.
 *
 * Unlike `String.prototype.trim()`, this does not strip U+000B (vertical tab)
 * or any other Unicode whitespace, so forbidden code points at URL
 * boundaries are preserved for the forbidden-code-point check below.
 *
 * @see https://infra.spec.whatwg.org/#strip-leading-and-trailing-ascii-whitespace
 */
function stripAsciiWhitespace(value: string): string {
	return value.replaceAll(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '');
}

/**
 * Unencoded space in URL body (after trimming leading/trailing spaces).
 * `new URL()` accepts spaces by percent-encoding them, but the WHATWG spec
 * considers them a validation error. nu-validator rejects them.
 */
const UNENCODED_SPACE = / /;

/**
 * Validates a URL string (potentially surrounded by spaces) per the WHATWG
 * URL Standard. Accepts both absolute and relative URLs.
 *
 * Uses `new URL()` for structural parsing and adds strict checks matching
 * the nu-html-checker's galimatias StrictErrorHandler behavior:
 * - Illegal whitespace (tabs, newlines) in URL
 * - Malformed percent-encoding
 * - Forbidden code points (C0/C1 controls, Unicode noncharacters)
 * - URLs that fail `new URL()` parsing (even with a dummy base)
 *
 * @see https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces
 * @see https://url.spec.whatwg.org/#url-code-points
 */
export const checkURL: CustomSyntaxChecker = () =>
	function checkURL(value) {
		log('CHECK: url');

		const trimmed = stripAsciiWhitespace(value);

		// Empty URL is valid for some attributes (e.g., <a href="">)
		// The spec says "valid URL potentially surrounded by spaces"
		// and the empty string resolves to the document's URL.
		if (trimmed === '') {
			return matched();
		}

		// Check for illegal whitespace (tab, newline, CR)
		if (ILLEGAL_WHITESPACE.test(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// Check for forbidden code points (C0/C1 controls, noncharacters)
		if (FORBIDDEN_CODE_POINT.test(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// Check for malformed percent-encoding
		if (MALFORMED_PERCENT.test(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// Check for unencoded spaces
		if (UNENCODED_SPACE.test(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// Try parsing as absolute URL first
		try {
			new URL(trimmed);
			return matched();
		} catch {
			// Not a valid absolute URL — try as relative
		}

		// Try parsing as relative URL with dummy base
		try {
			new URL(trimmed, DUMMY_BASE);
			return matched();
		} catch {
			// Both absolute and relative parsing failed
			return unmatched(trimmed, 'unexpected-token');
		}
	};
