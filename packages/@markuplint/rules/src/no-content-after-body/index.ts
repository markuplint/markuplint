import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * HTML LS "after body" insertion mode:
 *
 * > An end-of-file token: Stop parsing.
 * >
 * > Anything else: Parse error. Switch the insertion mode to "in body" and
 * > reprocess the token.
 *
 * Whitespace characters (U+0009/000A/000C/000D/0020) have their own case one
 * step above (they are processed with the rules of the 'in body' insertion
 * mode, without the parse error), so a trailing newline after the end tag is normal
 * and out of scope here — only a start tag or non-whitespace text reaching
 * this insertion mode is the "Anything else" parse error. Because the
 * reprocessing switches back to "in body", the offending content still ends
 * up nested inside `<body>` in the resulting tree even though, in the
 * source, it appears after the end tag that closed `<body>`.
 *
 * Scoped to `<body>`'s direct children: anything deeper (e.g. text inside a
 * later `<script>`) is that descendant's own content, not a stray token that
 * arrived after the body boundary closed.
 *
 * The end tag that closes `body` is its own `</body>`, or `</html>` when that comes first: in the in body insertion
 * mode `</html>` switches the insertion mode to "after body" and reprocesses the token, which then switches to "after
 * after body", whose "Anything else" is the same parse error:
 *
 * > Parse error. Switch the insertion mode to "in body" and reprocess the token.
 *
 * `body` has no end tag of its own then (`@markuplint/html-parser` keeps the first end of `body`), and the boundary
 * is the end tag of `html`, which the message names.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-afterbody
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody
 * @see https://html.spec.whatwg.org/multipage/parsing.html#the-after-after-body-insertion-mode
 */
export default createRule<boolean>({
	meta: meta,
	verify({ document, report, t }) {
		const body = document.querySelector('body');
		if (!body) return;

		const closedBy = closingElement(body);
		if (!closedBy?.closeTag) return;

		const bodyCloseEnd = closedBy.closeTag.startOffset + closedBy.closeTag.raw.length;
		const message = t('Content after the end tag of the "{0*}" element is not allowed', closedBy.localName);

		for (const child of body.childNodes) {
			if (child.startOffset < bodyCloseEnd) continue;

			if (child.is(child.ELEMENT_NODE)) {
				report({ scope: child, message });
				continue;
			}

			if (child.is(child.TEXT_NODE) && child.raw.trim() !== '') {
				report({ scope: child, message });
			}
		}
	},
});

/**
 * @param body - The `body` element
 * @returns The element whose end tag closed `body`: `body` itself, or the `html` element that is its parent when
 *   `body` has no end tag of its own; `null` when neither has one
 */
function closingElement(body: Element<boolean, undefined>): Element<boolean, undefined> | null {
	if (body.closeTag) {
		return body;
	}
	const parent = body.parentElement;
	if (parent?.localName === 'html' && parent.namespaceURI === 'http://www.w3.org/1999/xhtml' && parent.closeTag) {
		return parent;
	}
	return null;
}
