import type { JSXComment, JSXNode } from './jsx.js';
import type { MLASTBlockBehavior, MLASTNodeTreeItem, MLASTParentNode } from '@markuplint/ml-ast';
import type { ChildToken, Token } from '@markuplint/parser-utils';

import { Parser, ParserError } from '@markuplint/parser-utils';

import { jsxParser, attrParser, getName } from './jsx.js';
import { extractJSXFromCall } from './extract-jsx-from-call.js';

type State = {
	comments: readonly JSXComment[];
};

/**
 * Unlike most framework parsers, this extends the base `Parser` class directly
 * rather than `HtmlParser`: tokenization is done by
 * `@typescript-eslint/typescript-estree` instead of parse5, so the HTML-specific
 * behaviors of `HtmlParser` (ghost elements, head/body optimization, fragment
 * detection) are not needed.
 */
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
		// TSError from @typescript-eslint/typescript-estree exposes
		// `lineNumber` and `column` as prototype getter properties.
		// Some runtimes (e.g. Bun) may fail the `in` check for these
		// getters, so we read `error.location.start` (an own property
		// on TSError) directly instead.
		if (error instanceof Error && 'location' in error) {
			const loc = error.location as { start?: { line: number; column: number } };
			if (loc.start) {
				return new ParserError(error.message, {
					line: loc.start.line,
					col: loc.start.column,
				});
			}
		}
		return super.parseError(error);
	}

	/**
	 * Rebuilds parent-child relationships for psblock nodes
	 * (e.g. `JSXExpressionContainer`). This is necessary because `jsxParser()`
	 * returns a flat list: JSX elements found inside expression containers are
	 * collected separately from their containers, so the containment recorded
	 * via `__parentId` in `#parentIdMap` must be re-applied here by adopting
	 * orphan nodes as children of the corresponding psblock.
	 *
	 * @param nodeTree - The traversed node tree
	 * @returns The node tree with psblock children re-attached
	 */
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
				const isFragment = originNode.type === 'JSXFragment';
				const openTag = isFragment ? originNode.openingFragment : originNode.openingElement;
				const nodeName = isFragment ? '#jsx-fragment' : getName(originNode.openingElement.name);

				let token = this.sliceFragment(openTag.range[0], openTag.range[1]);

				// Masks comments that fall within the opening tag with spaces
				// so that comment syntax does not confuse the tag attribute
				// parser. The replacement must keep the same string length
				// (offset positions depend on it) and must preserve newlines
				// (line numbers depend on them).
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
						raw.slice(0, startOffset) + commentToken.raw.replaceAll(/[^\n]/g, ' ') + raw.slice(endOffset);

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
					},
					originNode.children,
					{
						namelessFragment: true,
						createEndTagToken: () => {
							const closeTag = isFragment ? originNode.closingFragment : originNode.closingElement;

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

				const childNodes: JSXNode[] = [];
				let blockBehavior: MLASTBlockBehavior | null = null;

				const mapReturn = extractJSXFromCall(originNode, 'map');

				if (mapReturn) {
					childNodes.push(mapReturn);
					blockBehavior = {
						type: 'each',
						expression: token.raw,
					};
				}

				const nodes = this.visitPsBlock(
					{
						...token,
						depth,
						parentNode,
						nodeName: originNode.type,
						isFragment: true,
					},
					childNodes,
					blockBehavior,
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

	/**
	 * JSX comments use JavaScript syntax rather than HTML bogus comments,
	 * so the resulting comment nodes must not be flagged as bogus.
	 */
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

	/**
	 * IDL attribute name mapping is not performed here; it is handled
	 * declaratively by react-spec's acceptedAttrNames and ml-core's attr
	 * resolution.
	 */
	visitAttr(token: Token) {
		const attr = super.visitAttr(token, {
			quoteSet: [
				{ start: '"', end: '"', type: 'string' },
				{ start: "'", end: "'", type: 'string' },
				{ start: '{', end: '}', type: 'script', parser: attrParser },
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
	 */
	detectElementType(nodeName: string) {
		return super.detectElementType(nodeName, /^[A-Z]|\./);
	}
}

export const parser = new JSXParser();
