import type { ChildNode, Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';
import { hasText } from '@markuplint/shared';

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
 * The outermost node that starts after the end tag is reported: a child of
 * `<body>`, or of an element that was still open there, which the reprocessed
 * content is inserted into (`<body><div></body><p>` puts the `p` in the `div`),
 * as a node goes into the current node:
 *
 * > Let targetParent be overrideTarget if it is not null; otherwise the current node.
 *
 * What is inside a reported node (e.g. text inside a later `<script>`) is that
 * node's own content, not another stray token. A `</body>` that the parser
 * ignores (in a table cell or a template) closes nothing, so the content after
 * it is not reported.
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
 * @see https://html.spec.whatwg.org/multipage/parsing.html#appropriate-place-for-inserting-a-node
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

		// The outermost nodes that start after the boundary: a child of `body`, or of an element that was still open at
		// the end tag (the reprocessed content is inserted into the current node, which that element is)
		const visit = (parent: { readonly childNodes: Iterable<ChildNode<boolean, undefined>> }) => {
			for (const child of parent.childNodes) {
				if (child.startOffset < bodyCloseEnd) {
					if (child.is(child.ELEMENT_NODE)) {
						visit(child);
					}
					continue;
				}

				if (child.is(child.ELEMENT_NODE)) {
					report({ scope: child, message });
					continue;
				}

				// The characters of the text, as the tokenizer gives them (`&#32;` is a white space character token)
				if (child.is(child.TEXT_NODE) && hasText(child.data)) {
					report({ scope: child, message });
				}
			}
		};
		visit(body);
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
