import type { SvelteAwaitBlock, SvelteEachBlock, SvelteIfBlock, SvelteNode } from './svelte-parser/index.js';
import type {
	MLASTNodeTreeItem,
	MLASTParentNode,
	MLASTPreprocessorSpecificBlock,
	MLASTBlockBehavior,
} from '@markuplint/ml-ast';
import type { ChildToken, ParseOptions, Token } from '@markuplint/parser-utils';

import { ParserError, Parser, AttrState } from '@markuplint/parser-utils';

import { parseBlock } from './parse-block.js';
import { svelteParse } from './svelte-parser/index.js';

/**
 * Parser implementation for Svelte component templates.
 * Extends the base Parser to handle Svelte elements, text, comments,
 * expression tags, control flow blocks (`{#if}`, `{#each}`, `{#await}`,
 * `{#key}`, `{#snippet}`), directives (`bind:`, `class:`, `on:`),
 * and shorthand attribute syntax.
 */
export class SvelteParser extends Parser<SvelteNode> {
	readonly specificBindDirective: ReadonlySet<string> = new Set(['group', 'this']);

	constructor() {
		super({
			endTagType: 'xml',
			tagNameCaseSensitive: true,
			ignoreTags: [
				// Fixed(Resolved) #2505
				// The script tag needs to be passed with the lang attribute to the parser,
				// so instead of excluding it, we convert it to PSBlock in visitText.
				// Keep the style tag as is for now.
				{
					type: 'Style',
					start: '<style',
					end: '</style>',
				},
			],
			maskChar: '-',
		});
	}

	tokenize() {
		return {
			ast: svelteParse(this.rawCode),
			isFragment: true,
		};
	}

	parse(raw: string, options?: ParseOptions) {
		return super.parse(raw, {
			...options,
			ignoreFrontMatter: false,
		});
	}

	parseError(error: any) {
		if (error instanceof Error && 'start' in error && 'end' in error && 'frame' in error) {
			// @ts-ignore
			const token = this.sliceFragment(error.start.character, error.end.character);
			throw new ParserError(error.message + '\n' + error.frame, token);
		}

		return super.parseError(error);
	}

	/**
	 * Converts a Svelte AST node into markuplint node tree items.
	 * Dispatches on the node type to handle Text, Comment, ExpressionTag,
	 * elements (Component, RegularElement), and control flow blocks
	 * (IfBlock, EachBlock, AwaitBlock, KeyBlock, SnippetBlock).
	 *
	 * @param originNode - The Svelte AST node to convert
	 * @param parentNode - The parent node in the markuplint tree, or null for root nodes
	 * @param depth - The nesting depth of the node
	 * @returns An array of markuplint node tree items
	 */
	nodeize(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: SvelteNode,
		parentNode: MLASTParentNode | null,
		depth: number,
	) {
		const token = this.sliceFragment(originNode.start, originNode.end);

		switch (originNode.type) {
			case 'Text': {
				return this.visitText({
					...token,
					depth,
					parentNode,
				});
			}
			case 'Comment': {
				return this.visitComment({
					...token,
					depth,
					parentNode,
				});
			}
			case 'ExpressionTag': {
				return this.visitPsBlock({
					...token,
					depth,
					parentNode,
					nodeName: 'ExpressionTag',
					isFragment: false,
				});
			}
			case 'Component':
			case 'RegularElement': {
				const children = originNode.fragment.nodes ?? [];
				const reEndTag = new RegExp(`</${originNode.name}\\s*>$`, 'i');
				const startTagEndOffset =
					children.length > 0
						? (children[0]?.start ?? 0)
						: token.raw.replace(reEndTag, '').length + token.offset;
				const startTagLocation = this.sliceFragment(token.offset, startTagEndOffset);

				return this.visitElement(
					{
						...startTagLocation,
						depth,
						parentNode,
						nodeName: originNode.name,
					},
					originNode.fragment.nodes,
					{
						createEndTagToken: () => {
							if (!reEndTag.test(token.raw)) {
								return null;
							}
							const endTagRawMatched = token.raw.match(reEndTag);
							if (!endTagRawMatched) {
								throw new Error('Parse error');
							}
							const endTagRaw = endTagRawMatched[0];
							const endTagStartOffset = token.offset + token.raw.lastIndexOf(endTagRaw);
							const endTagEndOffset = endTagStartOffset + endTagRaw.length;
							const endTagLocation = this.sliceFragment(endTagStartOffset, endTagEndOffset);

							return {
								...endTagLocation,
								depth,
								parentNode,
							};
						},
					},
				);
			}
			case 'IfBlock': {
				const expressions: MLASTPreprocessorSpecificBlock[] = [];
				const ifElseBlocks = this.#traverseIfBlock(originNode, token.offset);
				for (const ifElseBlock of ifElseBlocks) {
					const expression = this.visitPsBlock(
						{
							...ifElseBlock,
							depth,
							parentNode,
							nodeName: ifElseBlock.type,
							isFragment: false,
						},
						ifElseBlock.children,
						{
							type: (
								{
									if: 'if',
									elseif: 'if:elseif',
									else: 'if:else',
									'/if': 'end',
								} as const
							)[ifElseBlock.type],
							expression: ifElseBlock.raw,
						},
					)[0];
					expressions.push(expression);
				}
				return expressions;
			}
			case 'EachBlock': {
				return this.#parseEachBlock(
					{
						...token,
						depth,
						parentNode,
					},
					originNode,
				);
			}
			case 'AwaitBlock': {
				return this.#parseAwaitBlock(
					{
						...token,
						depth,
						parentNode,
					},
					originNode,
				);
			}
			case 'KeyBlock': {
				const { openToken, closeToken } = parseBlock(
					this,
					{
						...token,
						depth,
						parentNode,
					},
					originNode,
				);

				return [
					this.visitPsBlock(
						{
							...openToken,
							depth,
							parentNode,
							nodeName: 'key',
							isFragment: true,
						},
						originNode.fragment.nodes,
					)[0],
					this.visitPsBlock({
						...closeToken,
						depth,
						parentNode,
						nodeName: '/key',
						isFragment: true,
					})[0],
				];
			}
			case 'SnippetBlock': {
				const { openToken, closeToken } = parseBlock(
					this,
					{
						...token,
						depth,
						parentNode,
					},
					originNode,
				);

				return [
					this.visitPsBlock(
						{
							...openToken,
							depth,
							parentNode,
							nodeName: 'snippet',
							isFragment: false,
						},
						originNode.body.nodes,
					)[0],
					this.visitPsBlock({
						...closeToken,
						depth,
						parentNode,
						nodeName: '/snippet',
						isFragment: false,
					})[0],
				];
			}
			default: {
				const childNodes = 'fragment' in originNode ? originNode.fragment.nodes : [];

				return this.visitPsBlock(
					{
						...token,
						depth,
						parentNode,
						nodeName: originNode.type,
						isFragment: true,
					},
					childNodes,
				);
			}
		}
	}

	/**
	 * Visits a text token, converting `<script>` tags embedded in Svelte template
	 * text into preprocessor-specific blocks rather than treating them as raw text.
	 *
	 * @param token - The child token representing the text content
	 * @returns An array of markuplint node tree items
	 */
	visitText(token: ChildToken): readonly MLASTNodeTreeItem[] {
		const nodes = super.visitText(token, {
			researchTags: false,
			invalidTagAsText: false,
		});

		return nodes.flatMap(node => {
			if (node.nodeName === '#text' && /^<script[\s>]/i.test(node.raw)) {
				return this.visitPsBlock({
					...node,
					nodeName: 'Script',
					isFragment: false,
				});
			}
			return node;
		});
	}

	/**
	 * Visits a preprocessor-specific block token and enforces that exactly one
	 * block node is produced. Throws a ParserError if the result is empty
	 * or contains multiple nodes.
	 *
	 * @param token - The child token with node name and fragment flag
	 * @param childNodes - The child Svelte AST nodes within the block
	 * @param blockBehavior - The block behavior, or null
	 * @returns A single-element tuple containing the preprocessor-specific block
	 */
	visitPsBlock(
		token: ChildToken & {
			readonly nodeName: string;
			readonly isFragment: boolean;
		},
		childNodes: readonly SvelteNode[] = [],
		blockBehavior: MLASTBlockBehavior | null = null,
	): readonly [MLASTPreprocessorSpecificBlock] {
		const nodes = super.visitPsBlock(token, childNodes, blockBehavior);
		const block = nodes.at(0);

		if (!block || block.type !== 'psblock') {
			throw new ParserError('Parse error', token);
		}

		if (nodes.length > 1) {
			throw new ParserError('Parse error', nodes.at(1)!);
		}

		return [block];
	}

	/**
	 * Visits child nodes and verifies that no sibling nodes with differing
	 * hierarchy levels are produced. Throws a ParserError if unexpected
	 * sibling nodes are discovered.
	 *
	 * @param children - The child Svelte AST nodes to visit
	 * @param parentNode - The parent node in the markuplint tree
	 * @returns An empty array (all children are attached via the visitor)
	 */
	visitChildren(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		children: readonly SvelteNode[],
		parentNode: MLASTParentNode | null,
	): never[] {
		const siblings = super.visitChildren(children, parentNode);
		if (siblings.length > 0) {
			throw new ParserError('Discovered child nodes with differing hierarchy levels', siblings[0]!);
		}
		return [];
	}

	/**
	 * Visits an attribute token, handling Svelte-specific syntax including
	 * curly-brace expression values, shorthand attributes (`{name}`),
	 * `bind:` / `class:` directives, and duplicatable class attributes.
	 *
	 * @param token - The token representing the attribute
	 * @returns The parsed attribute node with Svelte-specific metadata
	 */
	visitAttr(token: Token) {
		const attr = super.visitAttr(token, {
			quoteSet: [
				{ start: '"', end: '"', type: 'string' },
				{ start: "'", end: "'", type: 'string' },
				{ start: '{', end: '}', type: 'script' },
			],
			startState:
				// is shorthand attribute
				token.raw.trim().startsWith('{') ? AttrState.BeforeValue : AttrState.BeforeName,
		});

		if (attr.type === 'spread') {
			return attr;
		}

		let isDynamicValue = attr.startQuote.raw === '{' || undefined;

		let potentialName: string | undefined;
		let isDirective: true | undefined;
		let isDuplicatable = false;

		if (isDynamicValue && attr.name.raw === '') {
			potentialName = attr.value.raw;
		}

		const [baseName, subName] = attr.name.raw.split(':');

		if (subName) {
			isDirective = true;

			if (baseName === 'bind' && !this.specificBindDirective.has(subName)) {
				potentialName = subName;
				isDirective = undefined;
				isDynamicValue = true;
			}
		}

		if (baseName?.toLowerCase() === 'class') {
			isDuplicatable = true;

			if (subName) {
				potentialName = 'class';
				isDynamicValue = true;
			}
		}

		if (attr.startQuote.raw === '{' && attr.endQuote.raw === '}') {
			isDynamicValue = true;
		}

		return {
			...attr,
			isDynamicValue,
			isDirective,
			isDuplicatable,
			potentialName,
		};
	}

	/**
	 * > A lowercase tag, like `<div>`, denotes a regular HTML element.
	 * A capitalised tag, such as `<Widget>` or `<Namespace.Widget>`, indicates a component.
	 *
	 * @see https://svelte.io/docs/basic-markup#tags
	 * @param nodeName
	 * @returns
	 */
	detectElementType(nodeName: string) {
		return super.detectElementType(nodeName, /^[A-Z]|\./);
	}

	/**
	 * Parses a Svelte `{#await}` block into its constituent preprocessor-specific blocks:
	 * the await expression, optional `{:then}` branch, optional `{:catch}` branch,
	 * and the closing `{/await}` tag.
	 *
	 * @param token - The child token representing the entire await block
	 * @param originBlockNode - The Svelte AST AwaitBlock node
	 * @returns An array of preprocessor-specific block nodes
	 */
	#parseAwaitBlock(
		token: ChildToken,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originBlockNode: SvelteAwaitBlock,
	) {
		const { closeToken } = parseBlock(this, token, originBlockNode);

		const pendingNodes = originBlockNode.pending?.nodes ?? [];
		const thenNodes = originBlockNode.then?.nodes ?? [];

		const pendingEnd = pendingNodes.at(-1)?.end;
		const thenEnd = thenNodes.at(-1)?.end;

		// @ts-ignore - new Svelte Compiler Type doesn't support `start` and `end` yet.
		const awaitConditionEnd: number = originBlockNode.expression.end;

		/**
		 * `{#await expression}...{:then name}...{:catch name}...{/await}`
		 *            find___^ and cut
		 *
		 * `}...{:then name}...{:catch name}...{/await}`
		 */
		const rawAwaitConditionBelow = this.rawCode.slice(awaitConditionEnd, originBlockNode.end);

		/**
		 * `}...{:then name}...{:catch name}...{/await}`
		 *  ^___find
		 */
		const awaitExpEnd = awaitConditionEnd + rawAwaitConditionBelow.indexOf('}') + 1;

		/**
		 * `{#await expression}`
		 */
		const awaitExpToken = this.sliceFragment(token.offset, awaitExpEnd);

		let thenToken: Token | null = null;

		/**
		 * `{#await expression}...{:then name}...{:catch name}...{/await}`
		 *                 find___^
		 */
		const thenExpStart = pendingEnd ?? awaitExpEnd;

		/**
		 * `{:then name}...{:catch name}...{/await}`
		 */
		const rawPendingNodesBelow = this.rawCode.slice(thenExpStart, originBlockNode.end);
		if (
			// eslint-disable-next-line regexp/strict
			/^{\s*:then[\s|}]/.test(rawPendingNodesBelow)
		) {
			let thenExpEndCharOffset: number;
			if (originBlockNode.value) {
				const thenIdentifierEnd =
					// @ts-ignore - new Svelte Compiler Type doesn't support `start` and `end` yet.
					originBlockNode.value.end;
				const rawThenExpCloseCharAndBelow = this.rawCode.slice(thenIdentifierEnd, originBlockNode.end);
				const thenExpEndCharIndex = rawThenExpCloseCharAndBelow.indexOf('}') + 1;
				thenExpEndCharOffset = thenIdentifierEnd + thenExpEndCharIndex;
			} else {
				thenExpEndCharOffset = thenExpStart + rawPendingNodesBelow.indexOf('}') + 1;
			}
			thenToken = this.sliceFragment(token.offset + thenExpStart, thenExpEndCharOffset);
		}

		let catchToken: Token | null = null;

		/**
		 * `{#await expression}...{:then name}...{:catch name}...{/await}`
		 *                                find___^
		 *
		 * If `then` block is not found:
		 *
		 * `{#await expression}...{:catch name}...{/await}`
		 *                 find___^
		 */
		const catchExpStart = thenToken
			? (thenEnd ?? thenToken.offset + thenToken.raw.length)
			: (pendingEnd ?? awaitExpEnd);

		/**
		 * `{:catch name}...{/await}`
		 */
		const rawThenNodesBelow = this.rawCode.slice(catchExpStart, originBlockNode.end);
		if (
			// eslint-disable-next-line regexp/strict
			/^{\s*:catch[\s|}]/.test(rawThenNodesBelow)
		) {
			let catchExpEndCharOffset: number;
			if (originBlockNode.error) {
				const catchIdentifierEnd =
					// @ts-ignore - new Svelte Compiler Type doesn't support `start` and `end` yet.
					originBlockNode.error.end;
				const rawCatchExpCloseCharAndBelow = this.rawCode.slice(catchIdentifierEnd, originBlockNode.end);
				const catchExpEndCharIndex = rawCatchExpCloseCharAndBelow.indexOf('}') + 1;
				catchExpEndCharOffset = catchIdentifierEnd + catchExpEndCharIndex;
			} else {
				catchExpEndCharOffset = catchExpStart + rawThenNodesBelow.indexOf('}') + 1;
			}
			catchToken = this.sliceFragment(token.offset + catchExpStart, catchExpEndCharOffset);
		}

		const expressions: MLASTPreprocessorSpecificBlock[] = [
			this.visitPsBlock(
				{
					...awaitExpToken,
					depth: token.depth,
					parentNode: token.parentNode,
					nodeName: 'await',
					isFragment: false,
				},
				originBlockNode.pending?.nodes,
				{
					type: 'await',
					expression: awaitExpToken.raw,
				},
			)[0],
		];

		if (thenToken) {
			expressions.push(
				this.visitPsBlock(
					{
						...thenToken,
						depth: token.depth,
						parentNode: token.parentNode,
						nodeName: 'await:then',
						isFragment: false,
					},
					originBlockNode.then?.nodes,
					{
						type: 'await:then',
						expression: thenToken.raw,
					},
				)[0],
			);
		}

		if (catchToken) {
			expressions.push(
				this.visitPsBlock(
					{
						...catchToken,
						depth: token.depth,
						parentNode: token.parentNode,
						nodeName: 'await:catch',
						isFragment: false,
					},
					originBlockNode.catch?.nodes,
					{
						type: 'await:catch',
						expression: catchToken.raw,
					},
				)[0],
			);
		}

		expressions.push(
			this.visitPsBlock(
				{
					...closeToken,
					depth: token.depth,
					parentNode: token.parentNode,
					nodeName: '/await',
					isFragment: false,
				},
				undefined,
				{
					type: 'end',
					expression: closeToken.raw,
				},
			)[0],
		);

		return expressions;
	}

	/**
	 * Parses a Svelte `{#each}` block into its constituent preprocessor-specific blocks:
	 * the each expression, optional `{:else}` fallback branch,
	 * and the closing `{/each}` tag.
	 *
	 * @param token - The child token representing the entire each block
	 * @param originBlockNode - The Svelte AST EachBlock node
	 * @returns An array of preprocessor-specific block nodes
	 */
	#parseEachBlock(
		token: ChildToken,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originBlockNode: SvelteEachBlock,
	) {
		const expressions: MLASTPreprocessorSpecificBlock[] = [];

		/**
		 * `{/each}`
		 */
		const { closeToken } = parseBlock(this, token, originBlockNode);

		/**
		 * `{#each expression as name}...{:else}...{/each}`
		 *                     find___^
		 */
		const bodyStart = originBlockNode.body.nodes.at(0)?.start ?? closeToken.offset;

		/**
		 * `{#each expression as name}...{:else}...{/each}`
		 *                               find___^
		 */
		const fallbackScopeStart = originBlockNode.fallback?.nodes.at(0)?.start ?? closeToken.offset;

		/**
		 * `{#each expression as name}...{:else}`
		 */
		const rawUntilFallbackScope = this.rawCode.slice(token.offset, fallbackScopeStart);

		let elseToken: Token | null = null;

		/**
		 * `{#each expression as name}...{:else}`
		 *                        find___^
		 */
		// eslint-disable-next-line regexp/strict
		const elseTokenStart = rawUntilFallbackScope.match(/{\s*:else\s*}$/)?.index;
		if (elseTokenStart != null) {
			elseToken = this.sliceFragment(token.offset + elseTokenStart, fallbackScopeStart);
		}

		const eachToken = this.sliceFragment(token.offset, bodyStart);

		expressions.push(
			this.visitPsBlock(
				{
					...eachToken,
					depth: token.depth,
					parentNode: token.parentNode,
					nodeName: 'each',
					isFragment: false,
				},
				originBlockNode.body.nodes,
				{ type: 'each', expression: eachToken.raw },
			)[0],
		);

		if (elseToken) {
			expressions.push(
				this.visitPsBlock(
					{
						...elseToken,
						depth: token.depth,
						parentNode: token.parentNode,
						nodeName: 'each:empty',
						isFragment: false,
					},
					originBlockNode.fallback?.nodes,
					{ type: 'each:empty', expression: elseToken.raw },
				)[0],
			);
		}

		expressions.push(
			this.visitPsBlock(
				{
					...closeToken,
					depth: token.depth,
					parentNode: token.parentNode,
					nodeName: '/each',
					isFragment: false,
				},
				undefined,
				{ type: 'end', expression: closeToken.raw },
			)[0],
		);

		return expressions;
	}

	/**
	 * Recursively traverses a Svelte `{#if}` block and its chained `{:else if}` / `{:else}`
	 * branches, producing a flat list of token segments with their conditional type labels
	 * and child node arrays.
	 *
	 * @param originBlockNode - The Svelte AST IfBlock node to traverse
	 * @param start - The source offset where this block segment begins
	 * @param type - The conditional branch type: 'if', 'elseif', or 'else'
	 * @returns A flat array of token segments with children and type labels
	 */
	#traverseIfBlock(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originBlockNode: SvelteIfBlock,
		start: number,
		type: 'if' | 'elseif' | 'else' = 'if',
	) {
		const result: (Token & { children: SvelteNode[]; type: 'if' | 'elseif' | 'else' | '/if' })[] = [];

		const end = originBlockNode.consequent.nodes?.[0]?.start ?? originBlockNode.end;
		const tag = this.sliceFragment(start, end);
		const children = originBlockNode.consequent.nodes;

		result.push({ ...tag, children, type });

		if (originBlockNode.alternate) {
			if (originBlockNode.alternate.nodes?.[0]?.type === 'IfBlock') {
				const elseif = this.#traverseIfBlock(
					originBlockNode.alternate.nodes[0],
					children.at(-1)?.end ?? start,
					'elseif',
				);
				result.push(...elseif);
			} else {
				const start = children.at(-1)?.end ?? originBlockNode.end;
				const end = originBlockNode.alternate.nodes?.[0]?.start;
				const tag = this.sliceFragment(start, end);
				result.push({
					...tag,
					children: originBlockNode.alternate.nodes,
					type: 'else',
				});
			}
		}

		{
			const start = result.at(-1)?.children.at(-1)?.end ?? originBlockNode.end;
			const end = originBlockNode.end;
			const tag = this.sliceFragment(start, end);
			if (tag.raw) {
				result.push({ ...tag, children: [], type: '/if' });
			}
		}

		return result;
	}
}

export const parser = new SvelteParser();
