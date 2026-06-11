import type { ASTNode, ASTComment } from './vue-parser/index.js';
import type { MLASTParentNode, MLASTNodeTreeItem } from '@markuplint/ml-ast';

import { ParserError, Parser } from '@markuplint/parser-utils';

import { vueParse } from './vue-parser/index.js';

type State = {
	comments: readonly ASTComment[];
};

/**
 * Directive resolution is intentionally not performed by this parser:
 * `directivePatterns` declared in `@markuplint/vue-spec` are applied later by
 * `ml-core`'s `MLAttr` constructor. Consequently, parser-level output (and
 * `index.spec.ts`) shows unresolved attribute metadata, while the final
 * `potentialName`/`isDirective`/`isDynamicValue` values only appear at the
 * core level.
 *
 * Known limitation: `v-if`/`v-for`/`v-else`/`v-else-if` do not set
 * `blockBehavior`, so content-model rules such as `permitted-contents` cannot
 * enumerate conditional branches via `conditionalChildNodes()` as they can for
 * Svelte, Pug, Alpine, JSX, and Astro. Unlike Alpine's fixed
 * `<template x-if="...">` wrapper, which converts cleanly into a PSBlock, Vue
 * directives attach to arbitrary elements that must remain valid HTML elements
 * for attribute validation while also acting as blocks for content-model
 * analysis, and `v-else`/`v-else-if` branch across sibling elements — both
 * beyond the per-node `nodeize()` model. These directives are handled at the
 * attribute level only (`isDirective: true`), which suppresses attribute
 * validation errors but provides no structural block information to the core
 * engine.
 */
class VueParser extends Parser<ASTNode, State> {
	constructor() {
		super(
			{
				// Vue SFC is a compiled format that uses explicit XML-style
				// closing tags (including `/>`), not HTML void-element rules.
				endTagType: 'xml',
			},
			{
				comments: [],
			},
		);
	}

	tokenize(): { readonly ast: ASTNode[]; readonly isFragment: boolean } {
		const ast = vueParse(this.rawCode);
		if (ast.templateBody?.comments) {
			this.state.comments = ast.templateBody.comments;
		}
		return {
			ast: ast.templateBody?.children ?? [],
			isFragment: true,
		};
	}

	parseError(error: any) {
		// vue-eslint-parser syntax errors carry `lineNumber` (1-based) and
		// `column` (0-based); non-SyntaxError cases fall back to the base handler.
		if (error instanceof SyntaxError && 'lineNumber' in error && 'column' in error) {
			throw new ParserError(error.message, {
				line: error.lineNumber as number,
				col: error.column as number,
				raw: '',
			});
		}
		return super.parseError(error);
	}

	nodeize(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: ASTNode,
		parentNode: MLASTParentNode | null,
		depth: number,
	) {
		const token = this.sliceFragment(originNode.range[0], originNode.range[1]);

		switch (originNode.type) {
			case 'VText': {
				return this.visitText({
					...token,
					depth,
					parentNode,
				});
			}
			case 'VExpressionContainer': {
				// Template expressions (`{{ ... }}`) are treated as opaque
				// pseudo-blocks; their JavaScript content is intentionally not parsed.
				return this.visitPsBlock({
					...token,
					depth,
					parentNode,
					nodeName: 'vue-expression-container',
					isFragment: false,
				});
			}
			default: {
				const token = this.sliceFragment(originNode.startTag.range[0], originNode.startTag.range[1]);

				return this.visitElement(
					{
						...token,
						depth,
						parentNode,
						nodeName: originNode.name,
					},
					originNode.children,
					{
						createEndTagToken: () => {
							if (!originNode.endTag) {
								return null;
							}
							const token = this.sliceFragment(originNode.endTag.range[0], originNode.endTag.range[1]);
							return {
								...token,
								depth,
								parentNode,
							};
						},
					},
				);
			}
		}
	}

	/**
	 * This second pass that interleaves comments is required because
	 * vue-eslint-parser provides comments separately (`templateBody.comments`)
	 * from the main node tree, so they cannot be emitted during `nodeize()`.
	 */
	flattenNodes(nodeTree: readonly MLASTNodeTreeItem[]) {
		const nodeList = super.flattenNodes(nodeTree);
		const newNodeList: MLASTNodeTreeItem[] = [];

		let prevNode: MLASTNodeTreeItem | null = null;
		for (const node of nodeList) {
			const lastOffset = prevNode
				? prevNode.offset + prevNode.raw.length
				: node.parentNode
					? node.parentNode.offset + node.parentNode.raw.length
					: 0;

			const betweenComment = this.state.comments.find(comment => {
				return lastOffset <= comment.range[0] && comment.range[1] <= node.offset;
			});

			if (betweenComment) {
				const token = this.sliceFragment(betweenComment.range[0], betweenComment.range[1]);

				const comment = this.visitComment(
					{
						...token,
						depth: node.depth,
						parentNode: node.parentNode ?? null,
					},
					{
						isBogus: betweenComment.type === 'HTMLBogusComment',
					},
				)[0];

				if (comment && comment.type === 'comment') {
					newNodeList.push(comment);

					if (node.parentNode) {
						this.appendChild(node.parentNode, comment);
					}
				}
			}

			newNodeList.push(node);

			prevNode = node;
		}

		return newNodeList;
	}

	afterFlattenNodes(nodeList: readonly MLASTNodeTreeItem[]) {
		// All base post-processing is disabled because Vue's template parser
		// handles whitespace and node validity differently from raw HTML parsing.
		return super.afterFlattenNodes(nodeList, {
			exposeInvalidNode: false,
			exposeWhiteSpace: false,
			concatText: false,
		});
	}

	/**
	 * > In SFCs, it's recommended to use `PascalCase` tag names
	 * > for child components to differentiate from native HTML elements.
	 * > Although native HTML tag names are case-insensitive,
	 * > Vue SFC is a compiled format so we are able to use case-sensitive tag names in it.
	 * > We are also able to use `/>` to close a tag.
	 *
	 * @see https://vuejs.org/guide/essentials/component-basics#using-a-component
	 * @see https://vuejs.org/api/built-in-components.html
	 * @see https://vuejs.org/api/built-in-special-elements.html#built-in-special-elements
	 */
	detectElementType(nodeName: string) {
		return super.detectElementType(nodeName, [
			// Built-in components
			'Transition',
			'TransitionGroup',
			'KeepAlive',
			'Teleport',
			'Suspense',
			// Special elements
			'component',
			'slot',
			// Backward compatibility
			/^[A-Z]/,
		]);
	}
}

export const parser = new VueParser();
