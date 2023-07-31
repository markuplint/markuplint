import type { ASTBlock, ASTNode } from './pug-parser/index.js';
import type {
	MLASTDoctype,
	MLASTNode,
	MLASTParentNode,
	MLASTPreprocessorSpecificBlock,
	MLASTTag,
	Parse,
} from '@markuplint/ml-ast';

import { getNamespace, parse as htmlParser, isDocumentFragment } from '@markuplint/html-parser';
import {
	detectElementType,
	ignoreFrontMatter,
	ParserError,
	tokenizer,
	uuid,
	walk,
	removeDeprecatedNode,
} from '@markuplint/parser-utils';

import attrTokenizer from './attr-tokenizer.js';
import { pugParse } from './pug-parser/index.js';

export const parse: Parse = (rawCode, options) => {
	let unknownParseError: string | undefined;
	let nodeList: MLASTNode[];

	if (options?.ignoreFrontMatter) {
		rawCode = ignoreFrontMatter(rawCode);
	}

	try {
		const parser = new Parser(rawCode);
		nodeList = parser.getNodeList();
	} catch (err) {
		nodeList = [];
		if (err instanceof Error && 'msg' in err && 'line' in err && 'column' in err && 'src' in err) {
			throw new ParserError(
				// @ts-ignore
				err.msg,
				{
					// @ts-ignore
					line: err.line,
					// @ts-ignore
					col: err.column,
					// @ts-ignore
					raw: err.src,
				},
			);
		}
		unknownParseError = err instanceof Error ? err.message : new Error(`${err}`).message;
	}

	return {
		nodeList,
		isFragment: isDocumentFragment(rawCode),
		unknownParseError: unknownParseError,
	};
};

class Parser {
	#ast: ASTBlock;

	constructor(raw: string) {
		this.#ast = pugParse(raw);
		// console.log(JSON.stringify(this.#ast, null, 2));
	}

	flattenNodes(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		nodeTree: readonly MLASTNode[],
	) {
		const nodeOrders: MLASTNode[] = [];
		walk(nodeTree, node => {
			nodeOrders.push(node);
		});

		removeDeprecatedNode(nodeOrders);

		return nodeOrders;
	}

	getNodeList() {
		const nodeTree = this.traverse(this.#ast.nodes, null);
		return this.flattenNodes(nodeTree);
	}

	nodeize(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originNode: ASTNode,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		prevNode: MLASTNode | null,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		parentNode: MLASTParentNode | null,
	): MLASTNode | MLASTNode[] | null {
		const nextNode = null;
		const startOffset = originNode.offset;
		const endOffset = originNode.endOffset;
		const startLine = originNode.line;
		const endLine = originNode.endLine;
		const startCol = originNode.column;
		const endCol = originNode.endColumn;
		const parentNamespace =
			parentNode && 'namespace' in parentNode ? parentNode.namespace : 'http://www.w3.org/1999/xhtml';

		switch (originNode.type) {
			case 'Doctype': {
				return {
					uuid: uuid(),
					raw: originNode.raw,
					name: originNode.val ?? '',
					// TODO:
					publicId: '',
					// TODO:
					systemId: '',
					startOffset,
					endOffset,
					startLine,
					endLine,
					startCol,
					endCol,
					nodeName: '#doctype',
					type: 'doctype',
					parentNode,
					prevNode,
					_addPrevNode: 102,
					nextNode,
					isFragment: false,
					isGhost: false,
				} as MLASTDoctype;
			}
			case 'Text': {
				if (parentNode && /^script$|^style$/i.test(parentNode.nodeName)) {
					return {
						uuid: uuid(),
						raw: originNode.raw,
						startOffset,
						endOffset,
						startLine,
						endLine,
						startCol,
						endCol,
						nodeName: '#text',
						type: 'text',
						parentNode,
						prevNode,
						nextNode,
						isFragment: false,
						isGhost: false,
					};
				}
				const htmlDoc = htmlParser(originNode.raw, {
					offsetOffset: originNode.offset,
					offsetLine: originNode.line - 1,
					offsetColumn: originNode.column - 1,
				});
				const nodes = htmlDoc.nodeList;
				for (const node of nodes) {
					if (!node.parentNode) {
						node.parentNode = parentNode;
					}
				}
				return nodes;
			}
			case 'Comment': {
				return {
					uuid: uuid(),
					raw: originNode.raw,
					startOffset,
					endOffset,
					startLine,
					endLine,
					startCol,
					endCol,
					nodeName: '#comment',
					type: 'comment',
					parentNode,
					prevNode,
					nextNode,
					isFragment: false,
					isGhost: false,
				};
			}
			case 'Tag': {
				const namespace = getNamespace(originNode.name, parentNamespace);
				const tag: MLASTTag = {
					uuid: uuid(),
					raw: originNode.raw,
					startOffset,
					endOffset,
					startLine,
					endLine,
					startCol,
					endCol,
					nodeName: originNode.name,
					type: 'starttag',
					namespace,
					elementType: detectElementType(originNode.name),
					attributes: originNode.attrs.map(attr => attrTokenizer(attr)),
					hasSpreadAttr: false,
					parentNode,
					prevNode,
					nextNode,
					pearNode: null,
					selfClosingSolidus: tokenizer('', originNode.line, originNode.column, originNode.offset),
					endSpace: tokenizer('', originNode.line, originNode.column, originNode.offset),
					isFragment: false,
					isGhost: false,
					tagOpenChar: '',
					tagCloseChar: '',
				};

				if (originNode.block.nodes.length > 0) {
					tag.childNodes = this.traverse(originNode.block.nodes, tag);
				}

				return tag;
			}
			default: {
				const tag: MLASTPreprocessorSpecificBlock = {
					uuid: uuid(),
					raw: originNode.raw,
					startOffset,
					endOffset,
					startLine,
					endLine,
					startCol,
					endCol,
					type: 'psblock',
					nodeName: originNode.type,
					parentNode,
					prevNode,
					nextNode,
					isFragment: true,
					isGhost: false,
				};

				if ('block' in originNode && originNode.block && originNode.block.nodes.length > 0) {
					tag.childNodes = this.traverse(originNode.block.nodes, tag);
				}

				return tag;
			}
		}
	}

	traverse(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		astNodes: readonly ASTNode[],
		parentNode: MLASTParentNode | null = null,
	): MLASTNode[] {
		const nodeList: MLASTNode[] = [];

		let prevNode: MLASTNode | null = null;
		for (const astNode of astNodes) {
			const nodes = this.nodeize(astNode, prevNode, parentNode);
			if (!nodes || (Array.isArray(nodes) && nodes.length === 0)) {
				continue;
			}

			let node: MLASTNode;
			if (Array.isArray(nodes)) {
				const lastNode = nodes[nodes.length - 1];
				if (!lastNode) {
					continue;
				}
				node = lastNode;
			} else {
				node = nodes;
			}

			if (prevNode) {
				if (node.type !== 'endtag') {
					prevNode.nextNode = node;
				}
				node.prevNode = prevNode;
			}
			prevNode = node;

			if (Array.isArray(nodes)) {
				nodeList.push(...nodes);
			} else {
				nodeList.push(nodes);
			}
		}

		return nodeList;
	}
}
