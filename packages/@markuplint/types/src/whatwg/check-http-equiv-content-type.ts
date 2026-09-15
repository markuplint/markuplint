import type { CustomSyntaxChecker } from '../types.js';

import { log } from '../debug.js';
import { matched, unmatched } from '../match-result.js';

// HTML LS's Encoding declaration state requires the literal string
// "charset=utf-8" — not an arbitrary Encoding LS label. Unlike the
// `charset` content attribute (a plain `enum: ["utf-8"]` in
// spec.meta.jsonc), this value is free-form text, so the literal is
// enforced here via regex instead.
const CONTENT_TYPE_RE = /^text\/html;[\t\n\f\r ]*charset=utf-8$/i;

/**
 * Validates the `content` attribute value of `<meta http-equiv="content-type">`
 * against the HTML Living Standard §4.2.5.2 "Encoding declaration" grammar:
 *
 *   ASCII case-insensitive "text/html;"
 *   , optionally ASCII whitespace
 *   , "charset=utf-8"
 *
 * @see https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type
 */
export const checkHTTPEquivContentType: CustomSyntaxChecker = () =>
	function checkHTTPEquivContentType(value) {
		log('CHECK: meta http-equiv="content-type" content');
		if (!CONTENT_TYPE_RE.test(value)) {
			return unmatched(value, 'syntax-error', {
				expects: [
					{
						type: 'format',
						value: 'text/html; charset=<encoding>',
					},
				],
			});
		}
		return matched();
	};
