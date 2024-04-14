import type { JSXComment, JSXNode } from './jsx.js';
import type { MLASTNodeTreeItem, MLASTParentNode } from '@markuplint/ml-ast';
import type { ChildToken, Token } from '@markuplint/parser-utils';

import { getNamespace } from '@markuplint/html-parser';
import { Parser, ParserError, searchIDLAttribute } from '@markuplint/parser-utils';

import { jsxParser, getName } from './jsx.js';

type State = {
	comments: readonly JSXComment[];
};

class JSXParser extends Parser<JSXNode, State> {
	#parentIdMap = new WeakMap<MLASTNodeTreeItem, number | null>();

	constructor() {
		super(
			{
				endTagType: 'xml',
				booleanish: true,
				tagNameCaseSensitive: true,
			},
			{
				comments: [],
			},
		);
	}

	tokenize() {
		const ast = jsxParser(this.rawCode);
		this.state.comments = ast.filter((node): node is JSXComment => node.type === 'Block' || node.type === 'Line');
		return {
			ast,
			isFragment: true,
		};
	}

	parseError(error: any) {
		if (error instanceof Error && 'lineNumber' in error && 'column' in error) {
			return new ParserError(error.message, {
				line: error.lineNumber as number,
				col: error.column as number,
			});
		}
		return super.parseError(error);
	}

	afterTraverse(nodeTree: readonly MLASTNodeTreeItem[]) {
		nodeTree = super.afterTraverse(nodeTree);

		this.walk(nodeTree, psBlockNode => {
			if (psBlockNode.type !== 'psblock') {
				return;
			}

			const nParentId = this.#parentIdMap.get(psBlockNode) ?? null;

			this.walk(nodeTree, candidate => {
				if (psBlockNode.uuid === candidate.uuid) {
					return;
				}

				const dParentId = this.#parentIdMap.get(candidate);

				if (nParentId !== dParentId) {
					return;
				}

				if (candidate.parentNode) {
					return;
				}

				if (candidate.type === 'doctype') {
					return;
				}

				this.updateLocation(candidate, {
					depth: psBlockNode.depth + 1,
				});

				this.appendChild(psBlockNode, candidate);
			});
		});

		return nodeTree;
	}

	nodeize(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: JSXNode,
		parentNode: MLASTParentNode | null,
		depth: number,
	) {
		const parentNamespace =
			parentNode && 'namespace' in parentNode ? parentNode.namespace : 'http://www.w3.org/1999/xhtml';

		if (originNode.__alreadyNodeized) {
			return [];
		}

		originNode.__alreadyNodeized = true;

		switch (originNode.type) {
			case 'Block':
			case 'Line': {
				const token = this.sliceFragment(originNode.range[0], originNode.range[1]);
				return this.visitComment({
					...token,
					depth,
					parentNode,
				});
			}
			case 'JSXText': {
				const token = this.sliceFragment(originNode.range[0], originNode.range[1]);
				const nodes = this.visitText({
					...token,
					depth,
					parentNode,
				});

				for (const node of nodes) {
					this.#parentIdMap.set(node, originNode.__parentId ?? null);
				}

				return nodes;
			}
			case 'JSXElement':
			case 'JSXFragment': {
				const openTag =
					originNode.type === 'JSXElement' ? originNode.openingElement : originNode.openingFragment;
				const nodeName =
					originNode.type === 'JSXElement' ? getName(originNode.openingElement.name) : '#jsx-fragment';

				let token = this.sliceFragment(openTag.range[0], openTag.range[1]);
				const namespace = getNamespace(nodeName, parentNamespace);

				for (const comment of this.state.comments) {
					if (comment.range[0] < openTag.range[0]) {
						continue;
					}
					if (openTag.range[1] < openTag.range[1]) {
						continue;
					}

					const raw = token.raw;
					const commentToken = this.sliceFragment(comment.range[0], comment.range[1]);

					const startOffset = comment.range[0] - openTag.range[0];
					const endOffset = startOffset + commentToken.raw.length;

					const maskedCode =
						// aboves
						raw.slice(0, startOffset) +
						// masked comment
						commentToken.raw.replaceAll(/[^\n]/g, ' ') +
						// bellows
						raw.slice(endOffset);

					token = {
						...token,
						raw: maskedCode,
					};
				}

				const nodes = this.visitElement(
					{
						...token,
						depth,
						parentNode,
						nodeName,
						namespace,
					},
					originNode.children,
					{
						namelessFragment: true,
						createEndTagToken: () => {
							const closeTag =
								originNode.type === 'JSXElement'
									? originNode.closingElement
									: originNode.closingFragment;

							if (!closeTag) {
								return null;
							}
							const token = this.sliceFragment(closeTag.range[0], closeTag.range[1]);

							return {
								...token,
								depth,
								parentNode,
							};
						},
					},
				);

				for (const node of nodes) {
					this.#parentIdMap.set(node, originNode.__parentId ?? null);
				}

				return nodes;
			}
			default: {
				const token = this.sliceFragment(originNode.range[0], originNode.range[1]);
				const nodes = this.visitPsBlock(
					{
						...token,
						depth,
						parentNode,
						nodeName: originNode.type,
					},
					[],
					originNode,
				);

				for (const node of nodes) {
					this.#parentIdMap.set(node, originNode.__parentId ?? null);
				}

				return nodes;
			}
		}
	}

	afterFlattenNodes(nodeList: readonly MLASTNodeTreeItem[]) {
		return super.afterFlattenNodes(nodeList, {
			exposeWhiteSpace: false,
			exposeInvalidNode: false,
		});
	}

	visitComment(token: ChildToken) {
		return super.visitComment(token).map(node => {
			if (node.type === 'comment') {
				return {
					...node,
					isBogus: false,
				};
			}
			return node;
		});
	}

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

		const rawName = attr.name.raw;
		const { idlPropName, contentAttrName } = searchIDLAttribute(rawName);

		this.updateAttr(attr, {
			potentialName: contentAttrName,
		});

		if (rawName !== idlPropName) {
			this.updateAttr(attr, {
				candidate: idlPropName,
			});
		}

		if (attr.startQuote.raw === '{' && attr.endQuote.raw === '}') {
			this.updateAttr(attr, {
				isDynamicValue: true,
			});
		}

		return attr;
	}

	parseCodeFragment(token: ChildToken) {
		return super.parseCodeFragment(token, {
			namelessFragment: true,
		});
	}

	/**
	 * > We recommend naming components with a capital letter.
	 * > If you do have a component that starts with a lowercase letter,
	 * > assign it to a capitalized variable before using it in JSX.
	 *
	 * @see https://reactjs.org/docs/jsx-in-depth.html#user-defined-components-must-be-capitalized
	 * @param nodeName
	 * @returns
	 */
	detectElementType(nodeName: string) {
		return super.detectElementType(nodeName, /^[A-Z]|\./);
	}
}

export const parser = new JSXParser();
