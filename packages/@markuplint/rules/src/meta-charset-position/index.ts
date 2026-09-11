import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

const BYTE_LIMIT = 1024;

/**
 * HTML LS §4.2.5.4 Specifying the document's character encoding:
 *
 * > The element containing the character encoding declaration must be
 * > serialized completely within the first 1024 bytes of the document.
 *
 * The limit is a byte count, not a character count — `Buffer.byteLength`
 * measures the UTF-8-encoded prefix rather than `String#length`, so
 * multi-byte characters before the declaration are counted at their actual
 * encoded size.
 *
 * @see https://html.spec.whatwg.org/multipage/semantics.html#charset
 */
export default createRule<boolean>({
	meta: meta,
	verify({ document, report, t }) {
		const declarations = document.querySelectorAll('meta[charset], meta[http-equiv="content-type" i]');

		for (const el of declarations) {
			const byteOffset = Buffer.byteLength(document.raw.slice(0, el.startOffset), 'utf8');
			if (byteOffset < BYTE_LIMIT) continue;

			report({
				scope: el,
				message: t(
					'The character encoding declaration must be within the first {0} bytes of the document',
					String(BYTE_LIMIT),
				),
			});
		}
	},
});
