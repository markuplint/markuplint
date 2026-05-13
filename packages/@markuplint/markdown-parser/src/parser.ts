import type { MLASTNodeTreeItem, MLASTParentNode } from '@markuplint/ml-ast';
import type { RootContent } from 'mdast';

import { HtmlParser } from '@markuplint/html-parser';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { MarkdownAwareParser, getLineAndColumn } from './markdown-aware-parser.js';

type MdastNode = RootContent;

/**
 * Parser for Markdown files that converts Markdown syntax to HTML AST elements.
 *
 * Uses remark-parse to produce an mdast, then maps Markdown constructs
 * (headings, paragraphs, lists, links, etc.) to their corresponding HTML
 * element AST nodes. Raw HTML regions are parsed via HtmlParser.
 */
class MarkdownParser extends MarkdownAwareParser {
	readonly #htmlParser = new HtmlParser();

	/**
	 * Tokenizes the raw Markdown source into an mdast tree.
	 *
	 * Resets parser state, parses via remark (with GFM and frontmatter plugins),
	 * and collects link/image reference definitions for later resolution.
	 *
	 * @returns The mdast children and fragment flag.
	 */
	tokenize() {
		this.resetMarkdownState();

		const processor = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ['yaml']);

		const mdast = processor.parse(this.rawCode);

		this.collectDefinitions(mdast.children);

		return {
			ast: mdast.children,
			isFragment: true,
		};
	}

	/**
	 * Converts a single mdast node into markuplint AST nodes.
	 *
	 * Delegates to the shared `nodeizeMarkdownNode()` for common Markdown
	 * constructs. Handles `html` regions via HtmlParser and `text` nodes directly.
	 *
	 * @param originNode - The mdast node to convert.
	 * @param parentNode - Parent AST node, or `null` for top-level.
	 * @param depth - Current nesting depth.
	 * @returns An array of markuplint AST nodes.
	 */
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodeize(originNode: MdastNode, parentNode: MLASTParentNode | null, depth: number) {
		const position = originNode.position;
		if (!position) {
			return [];
		}

		const offset = position.start.offset ?? 0;
		const endOffset = position.end.offset ?? offset;
		const token = this.sliceFragment(offset, endOffset);

		// Try common Markdown node handling first
		const result = this.nodeizeMarkdownNode(originNode, token, offset, endOffset, depth, parentNode);
		if (result !== null) {
			return result;
		}

		switch (originNode.type) {
			case 'html': {
				return this.#parseHtmlRegion(originNode, offset);
			}
			case 'text': {
				return this.visitText({
					...token,
					depth,
					parentNode,
				});
			}
			default: {
				return this.visitPsBlock({
					...token,
					depth,
					parentNode,
					nodeName: originNode.type,
					isFragment: false,
				});
			}
		}
	}

	#parseHtmlRegion(originNode: { readonly value: string }, offset: number): readonly MLASTNodeTreeItem[] {
		const { line, col } = getLineAndColumn(this.rawCode, offset);
		const doc = this.#htmlParser.parse(originNode.value, {
			offsetOffset: offset,
			offsetLine: line,
			offsetColumn: col,
			// HTML embedded inside Markdown is always a partial — never a
			// full document — so force fragment parsing to keep parse5 from
			// emitting `missing-doctype` / `misplaced-doctype` on every
			// inline HTML block. Users cannot meaningfully override this
			// because there is no Markdown construct that wraps a complete
			// HTML document.
			documentMode: 'fragment',
		});
		// Surface tokenizer-level parse errors (e.g. `duplicate-attribute`)
		// collected by the embedded HtmlParser. Without this, every parse
		// error inside an inline HTML block would be silently dropped on
		// the way back from `#htmlParser.parse()` even though the user has
		// opted in via `severity.parseError`.
		this.accumulateParseErrors(doc.parseErrors);
		return [...doc.nodeList];
	}
}

export const parser = new MarkdownParser();
