import { ASTBlock, ASTNode, pugParse } from './pug-parser';
import {
	MLASTDoctype,
	MLASTDocument,
	MLASTNode,
	MLASTNodeType,
	MLASTParentNode,
	MLASTPreprocessorSpecificBlock,
	MLASTTag,
	uuid,
} from '@markuplint/ml-ast';
import { parse as htmlParser, isDocumentFragment, removeDeprecatedNode, walk } from '@markuplint/html-parser';
import attrTokenizer from './attr-tokenizer';
import tokenizer from './tokenizer';

export default function parse(pug: string): MLASTDocument {
	let parseError: string | undefined;
	let nodeList: MLASTNode[];

	try {
		const parser = new Parser(pug);
		nodeList = parser.getNodeList();
	} catch (err) {
		nodeList = [];
		if (err instanceof Error) {
			parseError = err.message;
		} else {
			parseError = 'Unknown Error';
		}
	}

	return {
		nodeList,
		isFragment: isDocumentFragment(pug),
		parseError,
	};
}

class Parser {
	#raw: string;
	#ast: ASTBlock;

	constructor(raw: string) {
		this.#raw = raw;
		this.#ast = pugParse(raw);
		// console.log(JSON.stringify(this.#ast, null, 2));
	}

	getNodeList() {
		const nodeTree = this.traverse(this.#ast.nodes, null);
		return this.flattenNodes(nodeTree);
	}

	traverse(astNodes: ASTNode[], parentNode: MLASTParentNode | null = null): MLASTNode[] {
		const nodeList: MLASTNode[] = [];

		let prevNode: MLASTNode | null = null;
		for (const astNode of astNodes) {
			const nodes = this.nodeize(astNode, prevNode, parentNode);
			if (!nodes) {
				continue;
			}

			let node: MLASTNode;
			if (Array.isArray(nodes)) {
				node = nodes[nodes.length - 1];
			} else {
				node = nodes;
			}

			if (prevNode) {
				if (node.type !== MLASTNodeType.EndTag) {
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

	nodeize(
		originNode: ASTNode,
		prevNode: MLASTNode | null,
		parentNode: MLASTParentNode | null,
	): MLASTNode | MLASTNode[] | null {
		const nextNode = null;
		const startOffset = originNode.offset;
		const endOffset = originNode.endOffset;
		const startLine = originNode.line;
		const endLine = originNode.endLine;
		const startCol = originNode.column;
		const endCol = originNode.endColumn;

		switch (originNode.type) {
			case 'Doctype': {
				return {
					uuid: uuid(),
					raw: originNode.raw,
					name: originNode.val || '',
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
					type: MLASTNodeType.Doctype,
					parentNode,
					prevNode,
					_addPrevNode: 102,
					nextNode,
					isFragment: false,
					isGhost: false,
				} as MLASTDoctype;
			}
			case 'Text': {
				const htmlDoc = htmlParser(
					originNode.raw,
					originNode.offset,
					originNode.line - 1,
					originNode.column - 1,
				);
				const nodes = htmlDoc.nodeList;
				for (const node of nodes) {
					node.parentNode = parentNode;
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
					type: MLASTNodeType.Comment,
					parentNode,
					prevNode,
					nextNode,
					isFragment: false,
					isGhost: false,
				};
			}
			case 'Tag': {
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
					type: MLASTNodeType.StartTag,
					// TODO: SVG
					namespace: 'http://www.w3.org/1999/xhtml',
					attributes: originNode.attrs.map(attr => attrTokenizer(attr)),
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

				if (originNode.block.nodes.length) {
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
					type: MLASTNodeType.PreprocessorSpecificBlock,
					nodeName: originNode.type,
					parentNode,
					prevNode,
					nextNode,
					isFragment: true,
					isGhost: false,
				};

				if ('block' in originNode && originNode.block?.nodes.length) {
					tag.childNodes = this.traverse(originNode.block.nodes, tag);
				}

				return tag;
			}
		}
	}

	flattenNodes(nodeTree: MLASTNode[]) {
		const nodeOrders: MLASTNode[] = [];
		walk(nodeTree, node => {
			nodeOrders.push(node);
		});

		removeDeprecatedNode(nodeOrders);

		return nodeOrders;
	}
}
