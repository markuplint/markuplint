import type { ASTNode, ASTComment } from './vue-parser/index.js';
import type { MLASTParentNode, MLASTNodeTreeItem } from '@markuplint/ml-ast';
import type { Token } from '@markuplint/parser-utils';

import { ParserError, Parser } from '@markuplint/parser-utils';

import { vueParse } from './vue-parser/index.js';

type State = {
	comments: readonly ASTComment[];
};

class VueParser extends Parser<ASTNode, State> {
	readonly duplicatableAttrs = new Set(['class', 'style']);

	constructor() {
		super(
			{
				endTagType: 'xml',
			},
			{
				comments: [],
			},
		);
	}

	tokenize() {
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
						namespace: originNode.namespace,
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

	flattenNodes(nodeTree: readonly MLASTNodeTreeItem[]) {
		const nodeList = super.flattenNodes(nodeTree);
		const newNodeList: MLASTNodeTreeItem[] = [];

		let prevNode: MLASTNodeTreeItem | null = null;
		for (const node of nodeList) {
			const lastOffset = prevNode?.endOffset ?? node.parentNode?.endOffset ?? 0;

			const betweenComment = this.state.comments.find(comment => {
				return lastOffset <= comment.range[0] && comment.range[1] <= node.startOffset;
			});

			if (betweenComment) {
				const token = this.sliceFragment(betweenComment.range[0], betweenComment.range[1]);

				const comment = this.visitComment(
					{
						...token,
						depth: node.depth,
						parentNode: node.parentNode,
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
		return super.afterFlattenNodes(nodeList, {
			exposeInvalidNode: false,
			exposeWhiteSpace: false,
			concatText: false,
		});
	}

	visitAttr(token: Token) {
		const attr = super.visitAttr(token);

		if (attr.type === 'spread') {
			return attr;
		}

		{
			/**
			 * `v-on`
			 */
			const [, directive, potentialName] = attr.name.raw.match(/^(v-on:|@)([^.]+)(?:\.([^.]+))?$/i) ?? [];
			if (directive && potentialName) {
				return {
					...attr,
					potentialName: `on${potentialName.toLowerCase()}`,
					isDynamicValue: true as const,
				};
			}
		}

		{
			/**
			 * `v-bind`
			 */
			const [, directive, potentialName, modifier] =
				attr.name.raw.match(/^(v-bind:|:)([^.]+)(?:\.([^.]+))?$/i) ?? [];
			if (directive && potentialName) {
				if (this.duplicatableAttrs.has(potentialName.toLowerCase())) {
					this.updateAttr(attr, { isDuplicatable: true });
				}

				if (!modifier) {
					return {
						...attr,
						potentialName,
						isDynamicValue: true as const,
					};
				}

				switch (modifier) {
					case '.attr': {
						return {
							...attr,
							potentialName,
							isDynamicValue: true as const,
						};
					}
					/* eslint-disable unicorn/no-useless-switch-case */
					case '.prop':
					case '.camel':
					default: {
						const name = `v-bind:${potentialName}${modifier ?? ''}`;
						return {
							...attr,
							potentialName: attr.name.raw === name ? undefined : name,
							isDirective: true as const,
						};
					}
					/* eslint-enable unicorn/no-useless-switch-case */
				}
			}
		}

		{
			/**
			 * `v-model`
			 */
			const [, directive] = attr.name.raw.match(/^(v-model)(?:\.([^.]+))?$/i) ?? [];
			if (directive) {
				return {
					...attr,
					isDirective: true as const,
				};
			}
		}

		{
			/**
			 * `v-slot`
			 */
			const slotName = (attr.name.raw.match(/^(v-slot:|#)(.+)$/i) ?? [])[2];
			const name = `v-slot:${slotName}`;
			if (slotName) {
				return {
					...attr,
					potentialName: attr.name.raw === name ? undefined : name,
					isDirective: true as const,
				};
			}
		}

		/**
		 * If directives
		 */
		if (attr.name.raw.startsWith('v-')) {
			return {
				...attr,
				isDirective: true as const,
			};
		}

		return attr;
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
	 * @param nodeName
	 * @returns
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
