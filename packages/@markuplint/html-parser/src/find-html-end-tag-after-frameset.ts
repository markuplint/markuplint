import type { Element, Node, SourceRange } from './types.js';
import type { Token } from 'parse5';

import { html, Tokenizer, TokenizerMode } from 'parse5';

/**
 * Finds the `</html>` that closes the `html` element of a document whose body is a `frameset`.
 *
 * parse5 sets `sourceCodeLocation.endTag` of `html` when it reads `</html>` in the after body insertion mode
 * (`endTagAfterBody` calls `_setEndLocation`), but not when it reads it in the after frameset insertion mode
 * (`endTagAfterFrameset` only switches the mode), so the end tag has to be found in the source. The caller uses
 * this only when parse5 gives no `endTag`; once parse5 sets it in the after frameset insertion mode too, this
 * function and its calls in `HtmlParser#nodeize` and `HtmlParser#visitGhostElement` (for a document that omits
 * `<html>`) can be removed.
 *
 * The outermost `frameset` is popped only by its own end tag, and that switches to the after frameset insertion
 * mode; before that, `</html>` is ignored. In that mode the first `</html>` switches to the after after frameset
 * insertion mode, which ignores every later one. So the end tag is the first `</html>` token after the end tag of
 * the outermost `frameset`.
 *
 * Between the end tag of the outermost `frameset` and `</html>`, the tree construction changes the state of the
 * tokenizer for `<noframes>` only (processed using the rules for the in head insertion mode, which parse it as raw
 * text); every other start tag is ignored or, for `<html>`, only adds attributes. The tokenizer here follows the
 * same switch so that `</html>` in the text of `noframes`, in a comment, or in an attribute value is not taken for
 * the end tag.
 *
 * Only the root `html` of a document is looked at: an `html` and a `frameset` in `<svg>` or `<math>` are foreign
 * elements, closed without the insertion modes above, and the `</html>` after them belongs to the root (or, in a
 * fragment, to nothing).
 *
 * `Tokenizer` and `TokenizerMode` are `@internal` exports of parse5, which its semver does not cover; that is why
 * `package.json` takes parse5 with a tilde range. The range still accepts patch releases, on purpose: an exact
 * pin would keep the fixes of parse5 from consumers until markuplint is released again. A parse5 update that
 * changes them fails the specs of `the end tag of html in a frameset document` in `index.spec.ts`.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inframeset
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-afterframeset
 * @see https://html.spec.whatwg.org/multipage/parsing.html#the-after-after-frameset-insertion-mode
 *
 * @param rawCode - The source that parse5 parsed
 * @param node - A node of parse5; anything but the root `html` element of a document gives `null`
 * @returns The offsets of the end tag in `rawCode`, or `null` when the document has no `frameset` closed by its
 * end tag, or no `</html>` after it
 */
export function findHtmlEndTagAfterFrameset(
	rawCode: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: Node,
): SourceRange | null {
	if (
		node.nodeName !== 'html' ||
		!('namespaceURI' in node) ||
		node.namespaceURI !== html.NS.HTML ||
		node.parentNode?.nodeName !== '#document'
	) {
		return null;
	}
	const frameset = node.childNodes.find((child): child is Element => child.nodeName === 'frameset');
	const framesetEndTag = frameset?.sourceCodeLocation?.endTag;
	if (!framesetEndTag) {
		return null;
	}

	const base = framesetEndTag.endOffset;
	let found: { startOffset: number; endOffset: number } | null = null;

	const noop = () => {};
	const tokenizer: Tokenizer = new Tokenizer(
		{ sourceCodeLocationInfo: true },
		{
			onStartTag(token: Token.TagToken) {
				if (token.tagName === 'noframes') {
					tokenizer.state = TokenizerMode.RAWTEXT;
				}
			},
			onEndTag(token: Token.TagToken) {
				// `location` is always set with `sourceCodeLocationInfo: true`; the check narrows its type.
				if (token.tagName !== 'html' || !token.location) {
					return;
				}
				found = {
					startOffset: base + token.location.startOffset,
					endOffset: base + token.location.endOffset,
				};
				tokenizer.pause();
			},
			onComment: noop,
			onDoctype: noop,
			onEof: noop,
			onCharacter: noop,
			onNullCharacter: noop,
			onWhitespaceCharacter: noop,
		},
	);
	tokenizer.write(rawCode.slice(base), true);

	return found;
}
