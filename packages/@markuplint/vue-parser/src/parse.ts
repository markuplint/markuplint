import {
	MLASTDocument,
	MLASTElement,
	MLASTNode,
	MLASTNodeType,
	MLASTParentNode,
	MLASTTag,
	MLASTText,
} from '@markuplint/ml-ast/';
import vueParse, { ASTNode } from './vue-parser';
import UUID from 'uuid';
import getEndCol from './get-end-col';
import getEndLine from './get-end-line';
import parseRawTag from './parse-raw-tag';
import tagSplitter from './tag-splitter';

export default function parse(html: string) {
	const ast = vueParse(html);

	let nodeList: MLASTNode[] = [];
	const isFragment = true;

	if (ast.templateBody) {
		const nodeTree: MLASTNode[] = traverse(ast.templateBody, null, html);
		// console.dir(ast);

		nodeList = flattenNodes(nodeTree, html);
		// console.dir(nodeList);
	}

	const parsedDoc: MLASTDocument = {
		nodeList,
		isFragment,
	};

	return parsedDoc;
}

function nodeize(
	originNode: ASTNode,
	prevNode: MLASTNode | null,
	parentNode: MLASTParentNode | null,
	rawHtml: string,
): MLASTNode[] {
	// console.log(originNode);
	const nodes: MLASTNode[] = [];
	prevNode = prevNode || parentNode;
	const nextNode = null;
	switch (originNode.type) {
		case 'VText': {
			const startOffset = originNode.range[0];
			const endOffset = originNode.range[1];
			const startLine = originNode.loc.start.line;
			const endLine = originNode.loc.end.line;
			const startCol = originNode.loc.start.column;
			const endCol = originNode.loc.end.column;
			const raw = rawHtml.slice(startOffset, endOffset);
			if (parentNode && /^(?:script|style)$/i.test(parentNode.nodeName)) {
				nodes.push({
					uuid: UUID.v4(),
					raw,
					startOffset,
					endOffset,
					startLine,
					endLine,
					startCol,
					endCol,
					nodeName: '#text',
					type: MLASTNodeType.Text,
					parentNode,
					prevNode,
					nextNode,
					isFragment: false,
					isGhost: false,
				});
			} else {
				const tokens = tagSplitter(raw, startLine, startCol);
				let tokenStartOffset = startOffset;
				for (const token of tokens) {
					const tokenEndOffset = tokenStartOffset + token.raw.length;
					const node: MLASTText = {
						uuid: UUID.v4(),
						raw: token.raw,
						startOffset: tokenStartOffset,
						endOffset: tokenEndOffset,
						startLine: token.line,
						endLine: getEndLine(token.raw, token.line),
						startCol: token.col,
						endCol: getEndCol(token.raw, token.col),
						nodeName: '#text',
						type: MLASTNodeType.Text,
						parentNode,
						prevNode,
						nextNode,
						isFragment: false,
						isGhost: false,
					};
					nodes.push(node);
					prevNode = node;
					tokenStartOffset = tokenEndOffset;
				}
			}
			break;
		}
		case 'VExpressionContainer': {
			const startOffset = originNode.range[0];
			const endOffset = originNode.range[1];
			const startLine = originNode.loc.start.line;
			const endLine = originNode.loc.end.line;
			const startCol = originNode.loc.start.column;
			const endCol = originNode.loc.end.column;
			const raw = rawHtml.slice(startOffset, endOffset);
			nodes.push({
				uuid: UUID.v4(),
				raw,
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
			});
			break;
		}
		case 'VElement': {
			const startOffset = originNode.startTag.range[0];
			const endOffset = originNode.startTag.range[1];
			const startLine = originNode.startTag.loc.start.line;
			const endLine = originNode.startTag.loc.end.line;
			const startCol = originNode.startTag.loc.start.column;
			const endCol = originNode.startTag.loc.end.column;
			const raw = rawHtml.slice(startOffset, endOffset);
			const startTagRaw = raw;
			const tagTokens = parseRawTag(startTagRaw, startLine, startCol, startOffset);
			const tagName = tagTokens.tagName;
			let endTag: MLASTTag | null = null;
			const originEndTag = originNode.endTag;
			if (originEndTag) {
				const endTagRaw = rawHtml.slice(originEndTag.range[0], originEndTag.range[1]);
				const endTagTokens = parseRawTag(
					endTagRaw,
					originEndTag.loc.start.line,
					originEndTag.loc.start.column,
					originEndTag.range[0],
				);
				const endTagName = endTagTokens.tagName;
				endTag = {
					uuid: UUID.v4(),
					raw: endTagRaw,
					startOffset: originEndTag.range[0],
					endOffset: originEndTag.range[1],
					startLine: originEndTag.loc.start.line,
					endLine: originEndTag.loc.end.line,
					startCol: originEndTag.loc.start.column,
					endCol: originEndTag.loc.end.column,
					nodeName: endTagName,
					type: MLASTNodeType.EndTag,
					namespace: originNode.namespace,
					attributes: endTagTokens.attrs,
					parentNode,
					prevNode,
					nextNode,
					pearNode: null,
					isFragment: false,
					isGhost: false,
				};
			}
			const startTag: MLASTTag = {
				uuid: UUID.v4(),
				raw: startTagRaw,
				startOffset,
				endOffset,
				startLine,
				endLine,
				startCol,
				endCol,
				nodeName: tagName,
				type: MLASTNodeType.StartTag,
				namespace: originNode.namespace,
				attributes: tagTokens.attrs,
				parentNode,
				prevNode,
				nextNode,
				pearNode: endTag,
				selfClosingSolidus: tagTokens.selfClosingSolidus,
				endSpace: tagTokens.endSpace,
				isFragment: false,
				isGhost: false,
			};
			if (endTag) {
				endTag.pearNode = startTag;
			}
			startTag.childNodes = traverse(originNode, startTag, rawHtml);
			nodes.push(startTag);
			break;
		}
		default: {
			//
		}
	}
	return nodes;
}

function traverse(rootNode: ASTNode, parentNode: MLASTParentNode | null = null, rawHtml: string): MLASTNode[] {
	const nodeList: MLASTNode[] = [];

	if (rootNode.type !== 'VElement') {
		return [];
	}

	let prev: MLASTNode | null = null;
	for (const node of rootNode.children) {
		const nodes: MLASTNode[] = nodeize(node, prev, parentNode, rawHtml);
		for (const node of nodes) {
			if (prev) {
				prev.nextNode = node;
			}
			prev = node;
			nodeList.push(node);
		}
	}
	return nodeList;
}

export type Walker = (node: MLASTNode) => void;

export function walk(nodeList: MLASTNode[], walker: Walker) {
	for (const node of nodeList) {
		walker(node);
		const tag = node as MLASTElement;
		if (tag.childNodes && tag.childNodes.length) {
			walk(tag.childNodes, walker);
		}
		if (tag.pearNode) {
			walker(tag.pearNode);
		}
	}
}

function flattenNodes(nodeTree: MLASTNode[], rawHtml: string) {
	const nodeOrders: MLASTNode[] = [];

	/**
	 * pushing list
	 */
	walk(nodeTree, node => {
		nodeOrders.push(node);
	});

	/**
	 * sorting
	 */
	nodeOrders.sort((a, b) => {
		if (a.startOffset === b.startOffset) {
			if (a.isGhost && b.isGhost) {
				return 0;
			}
			if (a.isGhost) {
				return -1;
			}
			if (b.isGhost) {
				return 1;
			}
		}
		return a.startOffset - b.startOffset;
	});

	/**
	 * remove duplicated node
	 */
	const stack: { [pos: string]: number } = {};
	const removeIndexes: number[] = [];
	nodeOrders.forEach((node, i) => {
		if (node.isGhost) {
			return;
		}
		const id = `${node.startLine}:${node.startCol}:${node.endLine}:${node.endCol}`;
		if (stack[id] != null) {
			removeIndexes.push(i);
		}
		stack[id] = i;
	});
	let r = nodeOrders.length;
	while (r--) {
		if (removeIndexes.includes(r)) {
			nodeOrders.splice(r, 1);
		}
	}

	const result: MLASTNode[] = [];

	/**
	 * concat text nodes
	 *
	 * TODO: refactoring
	 */
	let prevSyntaxicalNode: MLASTNode | null = null;
	nodeOrders.forEach(node => {
		node.prevNode = prevSyntaxicalNode;
		prevSyntaxicalNode = node;
		if (node.prevNode && node.prevNode.type === MLASTNodeType.Text) {
			const prevSyntaxicalTextNode = node.prevNode;

			// concat contiguous textNodes
			if (node.type === MLASTNodeType.Text) {
				prevSyntaxicalTextNode.raw = prevSyntaxicalTextNode.raw + node.raw;
				prevSyntaxicalTextNode.endOffset = node.endOffset;
				prevSyntaxicalTextNode.endLine = node.endLine;
				prevSyntaxicalTextNode.endCol = node.endCol;
				prevSyntaxicalTextNode.nextNode = node.nextNode;
				prevSyntaxicalNode = prevSyntaxicalTextNode;
				return;
			}
		}
		result.push(node);
	});

	return result;
}
