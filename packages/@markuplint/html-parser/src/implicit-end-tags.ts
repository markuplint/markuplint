import type { Document, DocumentFragment, Node, SourceRange } from './types.js';
import type { DefaultTreeAdapterMap, ParserOptions, Token, TreeAdapter } from 'parse5';

import { defaultTreeAdapter, html, Parser } from 'parse5';

/**
 * The elements whose start tag the HTML Standard lets the author omit, and which the parsing algorithm inserts when
 * it is omitted. When the source writes the end tag, it closes the element that the algorithm inserted, so the end
 * tag belongs to it.
 *
 * The elements that the algorithm inserts and whose start tag the Standard does not let the author omit are not
 * here: `tr` for a bare `td` (a parse error), and `p` for `</p>` and `br` for `</br>`, where the end tag itself is
 * what makes the element. Their end tag stays orphaned.
 *
 * @see https://html.spec.whatwg.org/multipage/syntax.html#optional-tags
 */
const ELEMENTS_WITH_OPTIONAL_START_TAG: ReadonlySet<string> = new Set(['html', 'head', 'body', 'tbody', 'colgroup']);

/**
 * The elements that the tree construction ends more than once, as it never pops them: see {@link ImplicitEndTagParser}.
 */
const ENDED_MORE_THAN_ONCE: ReadonlySet<string> = new Set(['html', 'body']);

/**
 * A tree adapter that lets parse5 record the end tag of an element that it inserted without a start tag.
 *
 * parse5 gives such an element `sourceCodeLocation: null`, and `_setEndLocation` (`parse5/dist/parser/index.js`) sets
 * the end tag only on an element that has a location, so the end tag that the tree construction processed for it
 * (`</html>` after `<head></head><body></body>`, `</tbody>` after `<tr>`) is lost, and the parser takes it for an end
 * tag that closes nothing. The record is kept here, per element, and the element keeps `sourceCodeLocation: null`,
 * so the parser still knows that it has no start tag in the source.
 *
 * What is recorded is the token that the tree construction itself used to close the element, the same one it records
 * for an element written in the source, so no second pass over the source decides what the end tag is.
 *
 * The adapter relies on parse5 calling `getNodeSourceCodeLocation` / `updateNodeSourceCodeLocation` (public methods
 * of the tree adapter) for every location it sets or reads: `_setEndLocation` (from `onItemPop`, `stopParsing`,
 * `bodyEndTagInBody` and `endTagAfterBody`). Because an implicit element now has a location to read, parse5 also sets
 * the end of an element that it left alone before (`stopParsing` sets the end of the real `body` of a document that
 * omits `<html>` at the end of the source, not at the end of its start tag). `HtmlParser` reads only `startTag` and
 * `endTag` of a location, so nothing else changes. A parse5 update that changes this fails the specs in `implicit-end-tags.spec.ts` that pair the end tag of
 * an implicit element.
 *
 * `html` of a document whose body is a `frameset` is closed in the after frameset insertion mode, which sets no end
 * tag even for an element with a location; `findHtmlEndTagAfterFrameset` finds that one.
 *
 * @returns The adapter and a function that reads what it recorded
 */
function createImplicitEndTagAdapter(): {
	readonly adapter: TreeAdapter<DefaultTreeAdapterMap>;
	readonly getImplicitEndTag: (node: Node) => SourceRange | null;
} {
	const records = new WeakMap<object, Partial<Token.ElementLocation>>();

	const isImplicit = (node: object): boolean => {
		const element = node as { nodeName?: string; namespaceURI?: string; sourceCodeLocation?: unknown };
		return (
			element.sourceCodeLocation === null &&
			element.namespaceURI === html.NS.HTML &&
			ELEMENTS_WITH_OPTIONAL_START_TAG.has(element.nodeName ?? '')
		);
	};

	const adapter: TreeAdapter<DefaultTreeAdapterMap> = {
		...defaultTreeAdapter,
		getNodeSourceCodeLocation(node) {
			if (isImplicit(node)) {
				let record = records.get(node);
				if (!record) {
					record = {};
					records.set(node, record);
				}
				return record as Token.ElementLocation;
			}
			return defaultTreeAdapter.getNodeSourceCodeLocation(node);
		},
		updateNodeSourceCodeLocation(node, location) {
			if (isImplicit(node)) {
				const record = records.get(node) ?? {};
				records.set(node, { ...record, ...location });
				return;
			}
			defaultTreeAdapter.updateNodeSourceCodeLocation(node, location);
		},
	};

	return {
		adapter,
		getImplicitEndTag: node => records.get(node)?.endTag ?? null,
	};
}

/**
 * `Parser` of parse5 that does not read the location of a token it does not have, and that keeps the first end it
 * records for `body` and `html`.
 *
 * `onItemPop` passes `this.currentToken` to `_setEndLocation`, and parse5 sets `currentToken` only for start tags and
 * end tags. An element that is popped before the first of them (`<!doctype html>` and the end of the source) is popped with
 * `null`. parse5 never notices, because an element inserted without a tag has no location to set; with the record
 * of {@link createImplicitEndTagAdapter} it does, and `null.location` throws. No end tag can be recorded without a
 * token, so ignoring the call loses nothing.
 *
 * The first end that the tree construction records for `body` and for `html` is final, and a later call for it is
 * ignored. These two are never popped: parse5 records the end of `body` at every `</body>` that it processes while
 * `body` is in scope, and the end of `html` at every `</html>` in the after body insertion mode, so of two `</body>`
 * the second one, the surplus, would take the place of the first. The first `</body>` (or a `</html>` before it,
 * which ends `body` without an end tag of its own) is what closes `body`:
 *
 * > Switch the insertion mode to "after body".
 *
 * A later end tag that comes right after it reaches the after body (or after after body) insertion mode, where it is
 * a parse error and is processed again in the in body insertion mode:
 *
 * > Parse error. Switch the insertion mode to "in body" and reprocess the token.
 *
 * It then closes nothing, and the parser takes it for an orphaned end tag. Every other element is ended once, when it
 * is popped (`onItemPop`), so the rule is kept to `body` and `html`.
 *
 * Known limitation: when content comes between the two end tags (`</body>y</body>`), the parse error is the content,
 * which takes the parser back to the in body insertion mode, and the later `</body>` closes `body` again without a
 * parse error of its own. The syntax tree pairs an element with one end tag, so it keeps the first: the content is
 * then after the end tag (`no-content-after-body` reports it), and the later end tag is orphaned. Keeping the later
 * one instead would orphan the first, which is not a parse error either, and hide the content that is.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-afterbody
 * @see https://html.spec.whatwg.org/multipage/parsing.html#the-after-after-body-insertion-mode
 */
class ImplicitEndTagParser extends Parser<DefaultTreeAdapterMap> {
	readonly #ended = new WeakSet<object>();

	override _setEndLocation(
		element: Parameters<Parser<DefaultTreeAdapterMap>['_setEndLocation']>[0],
		closingToken: Token.Token | null,
	) {
		if (!closingToken || this.#ended.has(element)) {
			return;
		}
		// The condition under which `_setEndLocation` of parse5 records anything: an element is ended only by a call that
		// records its end
		if (
			closingToken.location &&
			this.treeAdapter.getNodeSourceCodeLocation(element) &&
			this.treeAdapter.getNamespaceURI(element) === html.NS.HTML &&
			ENDED_MORE_THAN_ONCE.has(this.treeAdapter.getTagName(element))
		) {
			this.#ended.add(element);
		}
		super._setEndLocation(element, closingToken);
	}
}

/**
 * Parses with parse5 as `parse` / `parseFragment` do, and also records the end tag of every element that the parser
 * inserted without a start tag (see {@link createImplicitEndTagAdapter}).
 *
 * `Parser` is an `@internal` export of parse5, which its semver does not cover; that is why `package.json` takes
 * parse5 with a tilde range (see `findHtmlEndTagAfterFrameset`). The body of this function is that of `parse` and
 * `parseFragment` of parse5, so that a parse5 update that changes them can be followed here.
 *
 * @param rawCode - The source
 * @param isFragment - Parses as a fragment, with no `html`, `head` and `body` of its own
 * @param options - The options of parse5; `treeAdapter` is taken by this function
 * @returns The root node (a document or a fragment), and a function that reads the end tag recorded for an element
 */
export function parseWithImplicitEndTags(
	rawCode: string,
	isFragment: boolean,
	options: Omit<ParserOptions<DefaultTreeAdapterMap>, 'treeAdapter'>,
): { readonly root: Document | DocumentFragment; readonly getImplicitEndTag: (node: Node) => SourceRange | null } {
	const { adapter, getImplicitEndTag } = createImplicitEndTagAdapter();
	const opts = { ...options, treeAdapter: adapter };
	if (isFragment) {
		const parser = ImplicitEndTagParser.getFragmentParser(null, opts);
		parser.tokenizer.write(rawCode, true);
		return { root: parser.getFragment(), getImplicitEndTag };
	}
	return { root: ImplicitEndTagParser.parse(rawCode, opts), getImplicitEndTag };
}
