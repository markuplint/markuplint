import type { MLASTNodeTreeItem, MLASTParentNode } from '@markuplint/ml-ast';
import type { Token } from '@markuplint/parser-utils';
import type { RootContent } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { MarkdownAwareParser } from '@markuplint/markdown-parser';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

type MdastNode = RootContent;

/**
 * Parser for MDX files that maps JSX elements to markuplint's AST.
 *
 * Uses remark-parse + remark-mdx to produce an MDX-extended mdast,
 * then converts JSX elements to MLASTElement nodes and delegates
 * Markdown content to the shared MarkdownAwareParser base class.
 *
 * remark-parse + remark-mdx was chosen over `@mdx-js/mdx`, which wraps the
 * same two packages and adds about 24 unnecessary dependencies for JS
 * compilation that linting does not need; the parse-stage mdast is identical
 * either way.
 *
 * Targets MDX v2/v3 only: MDX v1 uses a fundamentally different parser
 * architecture with no shared code, is deprecated, and the ecosystem has
 * migrated to v2/v3.
 *
 * No dedicated `@markuplint/mdx-spec` package exists because MDX uses React
 * JSX syntax; pair this parser with `@markuplint/react-spec`, which provides
 * the JSX attribute mappings (e.g. `className` -> `class`).
 */
class MDXParser extends MarkdownAwareParser {
	constructor() {
		super({
			endTagType: 'xml',
			booleanish: true,
			tagNameCaseSensitive: true,
		});
	}

	/**
	 * Tokenizes the raw MDX source into an mdast tree.
	 *
	 * Resets parser state, parses via remark (with GFM, MDX, and frontmatter
	 * plugins), collects link/image reference definitions, and flattens
	 * JSX elements out of paragraph wrappers.
	 *
	 * @returns The flattened mdast children and fragment flag.
	 */
	tokenize() {
		this.resetMarkdownState();

		const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdx).use(remarkFrontmatter, ['yaml']);

		const mdast = processor.parse(this.rawCode);

		this.collectDefinitions(mdast.children);

		return {
			ast: flattenMdastChildren(mdast.children),
			isFragment: true,
		};
	}

	/**
	 * Converts a single mdast node into markuplint AST nodes.
	 *
	 * Handles MDX-specific nodes (JSX elements, expressions, ESM imports/exports)
	 * first, then delegates to the shared `nodeizeMarkdownNode()` for common
	 * Markdown constructs.
	 *
	 * @param originNode - The mdast node to convert.
	 * @param parentNode - Parent AST node, or `null` for top-level.
	 * @param depth - Current nesting depth.
	 * @returns An array of markuplint AST nodes.
	 */
	nodeize(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: MdastNode,
		parentNode: MLASTParentNode | null,
		depth: number,
	) {
		const position = originNode.position;
		if (!position) {
			return [];
		}

		const offset = position.start.offset ?? 0;
		const endOffset = position.end.offset ?? offset;
		const token = this.sliceFragment(offset, endOffset);

		// MDX-specific node types first
		switch (originNode.type) {
			case 'mdxJsxFlowElement':
			case 'mdxJsxTextElement': {
				return this.#visitJsxElement(originNode, token, depth, parentNode);
			}
			case 'mdxFlowExpression':
			case 'mdxTextExpression': {
				return this.visitPsBlock({
					...token,
					depth,
					parentNode,
					nodeName: originNode.type,
					isFragment: false,
				});
			}
			case 'mdxjsEsm': {
				return this.visitPsBlock({
					...token,
					depth,
					parentNode,
					nodeName: 'mdxjsEsm',
					isFragment: false,
				});
			}
		}

		// Try common Markdown node handling
		const result = this.nodeizeMarkdownNode(originNode, token, offset, endOffset, depth, parentNode);
		if (result !== null) {
			return result;
		}

		switch (originNode.type) {
			case 'text': {
				return this.visitText({
					...token,
					depth,
					parentNode,
				});
			}
			case 'html': {
				return this.parseCodeFragment({
					...token,
					depth,
					parentNode,
				});
			}
			default: {
				// Unhandled node types fallback to psblock
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

	/**
	 * Processes a JSX attribute token with dynamic value detection.
	 * IDL attribute name mapping is now handled declaratively by the spec's
	 * acceptedAttrNames and ml-core's attr resolution.
	 *
	 * @param token - The raw attribute token from the source.
	 * @returns The processed attribute node.
	 */
	visitAttr(token: Token) {
		const attr = super.visitAttr(token, {
			quoteSet: [
				{ start: '"', end: '"', type: 'string' },
				{ start: "'", end: "'", type: 'string' },
				{ start: '{', end: '}', type: 'script' },
			],
		});

		if (attr.type === 'spread') {
			return attr;
		}

		if (attr.startQuote.raw === '{' && attr.endQuote.raw === '}') {
			this.updateAttr(attr, {
				isDynamicValue: true,
			});
		}

		return attr;
	}

	/**
	 * MDX components use uppercase or dot notation following React's convention.
	 *
	 * @param nodeName - The element name to classify.
	 * @returns The element type (`'html'` or `'authored'`).
	 */
	detectElementType(nodeName: string) {
		return super.detectElementType(nodeName, /^[A-Z]|\./);
	}

	#visitJsxElement(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: MdxJsxFlowElement | MdxJsxTextElement,
		token: Token,
		depth: number,
		parentNode: MLASTParentNode | null,
	): readonly MLASTNodeTreeItem[] {
		const children = originNode.children;
		const isSelfClosing = token.raw.trimEnd().endsWith('/>');

		if (isSelfClosing || children.length === 0) {
			const parsedNodes = this.parseCodeFragment(
				{
					...token,
					depth,
					parentNode,
				},
				{ namelessFragment: true },
			);

			const startTag = parsedNodes.at(0);
			if (!startTag || startTag.type !== 'starttag') {
				return this.visitPsBlock({
					...token,
					depth,
					parentNode,
					nodeName: originNode.type,
					isFragment: false,
				});
			}

			return super.visitElement({ ...startTag, parentNode: startTag.parentNode ?? null }, [], {
				namelessFragment: true,
				createEndTagToken: () => null,
			});
		}

		const firstChild = children[0];
		const lastChild = children.at(-1);
		const firstChildOffset = firstChild?.position?.start.offset ?? token.offset + token.raw.length;
		const lastChildEndOffset = lastChild?.position?.end.offset ?? firstChildOffset;
		const elementEndOffset = originNode.position?.end.offset ?? 0;

		const startTagToken = this.sliceFragment(token.offset, firstChildOffset);

		const parsedNodes = this.parseCodeFragment(
			{
				...startTagToken,
				depth,
				parentNode,
			},
			{ namelessFragment: true },
		);

		const startTag = parsedNodes.at(0);
		if (!startTag || startTag.type !== 'starttag') {
			return this.visitPsBlock({
				...token,
				depth,
				parentNode,
				nodeName: originNode.type,
				isFragment: false,
			});
		}

		return super.visitElement(
			{ ...startTag, parentNode: startTag.parentNode ?? null },
			[...children] as MdastNode[],
			{
				namelessFragment: true,
				createEndTagToken: () => {
					if (lastChildEndOffset >= elementEndOffset) {
						return null;
					}
					const endTagToken = this.sliceFragment(lastChildEndOffset, elementEndOffset);
					if (!endTagToken.raw.trim()) {
						return null;
					}
					return {
						...endTagToken,
						depth,
						parentNode,
					};
				},
			},
		);
	}
}

/**
 * remark-mdx wraps inline JSX elements that appear in flowing text in
 * `paragraph` nodes; unwrapping them keeps the JSX elements directly
 * accessible to lint rules, while pure-Markdown paragraphs are kept as-is.
 *
 * Only inspects direct children of root; does not recurse into nested nodes.
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function flattenMdastChildren(children: MdastNode[]): MdastNode[] {
	const result: MdastNode[] = [];

	for (const child of children) {
		if (child.type === 'paragraph' && 'children' in child) {
			const pgChildren = (child as { children: MdastNode[] }).children;
			const hasJsx = pgChildren.some(c => c.type === 'mdxJsxTextElement' || c.type === 'mdxTextExpression');

			if (hasJsx) {
				result.push(...pgChildren);
			} else {
				result.push(child);
			}
		} else {
			result.push(child);
		}
	}

	return result;
}

export const parser = new MDXParser();
