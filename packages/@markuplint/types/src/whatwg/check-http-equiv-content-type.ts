import type { CustomSyntaxChecker } from '../types.js';

import { log } from '../debug.js';
import { matched, unmatched } from '../match-result.js';

// Encoding LS §4.1 defines labels as ASCII alphanumerics plus "." "_" "-".
// The pattern below enforces the label *shape*, not the enumerated label
// table. HTML LS's "the document must be UTF-8" requirement is a
// document-level concern checked elsewhere and intentionally not baked in
// here — otherwise `<meta http-equiv="content-type" content="text/html;
// charset=iso-8859-1">` would raise two overlapping violations.
const CONTENT_TYPE_RE = /^text\/html;[\t\n\f\r ]*charset=[\w.-]+$/i;

/**
 * Validates the `content` attribute value of `<meta http-equiv="content-type">`
 * against the HTML Living Standard §4.2.5.2 "Encoding declaration" grammar:
 *
 *   ASCII case-insensitive "text/html;"
 *   , optionally ASCII whitespace
 *   , "charset="
 *   , character encoding label
 *
 * @see https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type
 * @see https://encoding.spec.whatwg.org/#names-and-labels
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
