import type { CustomSyntaxChecker } from '../types.js';

import { log } from '../debug.js';
import { matched, unmatched } from '../match-result.js';

/**
 * HTML LS §4.2.5.2 "Encoding declaration" content grammar:
 *
 *   ASCII case-insensitive "text/html;"
 *   , optionally ASCII whitespace
 *   , "charset="
 *   , character encoding label
 *
 * Encoding LS §4.1 defines labels as ASCII alphanumerics plus "." "_" "-":
 * the grammar below enforces the label shape, not the enumerated label
 * table. HTML's "the document must be UTF-8" requirement is a
 * document-level concern checked elsewhere and intentionally not baked in
 * here — otherwise `<meta http-equiv="content-type" content="text/html;
 * charset=iso-8859-1">` would raise two overlapping violations.
 *
 * @see https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type
 * @see https://encoding.spec.whatwg.org/#names-and-labels
 */
const CONTENT_TYPE_RE = /^text\/html;[\t\n\f\r ]*charset=[\w.-]+$/i;

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
