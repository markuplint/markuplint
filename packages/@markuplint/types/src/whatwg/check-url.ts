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
 * C0 control characters (U+0000–U+001F) and DEL (U+007F) are forbidden
 * in URLs. Excludes TAB/LF/CR which are caught by ILLEGAL_WHITESPACE.
 */
// eslint-disable-next-line no-control-regex
const C0_CONTROL = /[\u0000-\u0008\v\u000E-\u001F\u007F]/;

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
 * - C0 control characters
 * - URLs that fail `new URL()` parsing (even with a dummy base)
 *
 * @see https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces
 * @see https://url.spec.whatwg.org/#url-code-points
 */
export const checkURL: CustomSyntaxChecker = () =>
	function checkURL(value) {
		log('CHECK: url');

		const trimmed = value.trim();

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

		// Check for C0 control characters
		if (C0_CONTROL.test(trimmed)) {
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
