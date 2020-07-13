import {
	MLASTDocument,
	MLASTElement,
	MLASTElementCloseTag,
	MLASTNode,
	MLASTNodeType,
	MLASTParentNode,
	MLASTTag,
	MLASTText,
	uuid,
} from '@markuplint/ml-ast';
import vueParse, { ASTNode } from './vue-parser';
import { flattenNodes } from '@markuplint/html-parser';
import getEndCol from './get-end-col';
import getEndLine from './get-end-line';
import parseRawTag from './parse-raw-tag';

export default function parse(html: string): MLASTDocument {
	const ast = vueParse(html);

	const nodeList: MLASTNode[] = ast.templateBody ? flattenNodes(traverse(ast.templateBody, null, html), html) : [];

	// Remove `</template>`
	const templateEndTagIndex = nodeList.findIndex(node => /\s*<\/\s*template\s*>\s*/i.test(node.raw));
	if (templateEndTagIndex !== -1) {
		const templateEndTag = nodeList[templateEndTagIndex];
		for (const node of nodeList) {
			if (node.nextNode && node.nextNode.uuid === templateEndTag.uuid) {
				node.nextNode = null;
			}
		}
		nodeList.splice(templateEndTagIndex, 1);
	}

	return {
		nodeList,
		isFragment: true,
	};
}

function traverse(rootNode: ASTNode, parentNode: MLASTParentNode | null = null, rawHtml: string): MLASTNode[] {
	const nodeList: MLASTNode[] = [];

	if (rootNode.type !== 'VElement') {
		return [];
	}

	let prevNode: MLASTNode | null = null;
	for (const vNode of rootNode.children) {
		const node = nodeize(vNode, prevNode, parentNode, rawHtml);
		if (!node) {
			continue;
		}
		if (prevNode) {
			if (node.type !== MLASTNodeType.EndTag) {
				prevNode.nextNode = node;
			}
			node.prevNode = prevNode;
		}
		prevNode = node;
		nodeList.push(node);
	}
	return nodeList;
}

function nodeize(
	originNode: ASTNode,
	prevNode: MLASTNode | null,
	parentNode: MLASTParentNode | null,
	rawHtml: string,
): MLASTNode | null {
	const nextNode = null;
	const startOffset = originNode.range[0];
	const endOffset = originNode.range[1];
	const startLine = originNode.loc.start.line;
	const endLine = originNode.loc.end.line;
	const startCol = originNode.loc.start.column;
	const endCol = originNode.loc.end.column;
	const raw = rawHtml.slice(startOffset, endOffset || startOffset);

	switch (originNode.type) {
		case 'VText': {
			const node: MLASTText = {
				uuid: uuid(),
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
			};
			return node;
		}
		case 'VExpressionContainer': {
			return {
				uuid: uuid(),
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
			};
		}
		default: {
			const tagLoc = originNode.startTag;
			const startTagRaw = rawHtml.slice(tagLoc.range[0], tagLoc.range[1]);
			const tagTokens = parseRawTag(startTagRaw, startLine, startCol, startOffset);
			const tagName = tagTokens.tagName;
			let endTag: MLASTElementCloseTag | null = null;
			const endTagLoc = originNode.endTag;
			if (endTagLoc) {
				const endTagRaw = rawHtml.slice(endTagLoc.range[0], endTagLoc.range[1]);
				const endTagTokens = parseRawTag(
					endTagRaw,
					endTagLoc.loc.start.line,
					endTagLoc.loc.start.column,
					endTagLoc.range[0],
				);
				const endTagName = endTagTokens.tagName;
				endTag = {
					uuid: uuid(),
					raw: endTagRaw,
					startOffset: endTagLoc.range[0],
					endOffset: endTagLoc.range[1],
					startLine: endTagLoc.loc.start.line,
					endLine: endTagLoc.loc.end.line,
					startCol: endTagLoc.loc.start.column,
					endCol: endTagLoc.loc.end.column,
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
					tagOpenChar: '</',
					tagCloseChar: '>',
				};
			}
			const startTag: MLASTTag = {
				uuid: uuid(),
				raw: startTagRaw,
				startOffset,
				endOffset: startOffset + startTagRaw.length,
				startLine,
				endLine: getEndLine(startTagRaw, startLine),
				startCol,
				endCol: getEndCol(startTagRaw, startCol),
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
				tagOpenChar: '<',
				tagCloseChar: '>',
			};
			if (endTag) {
				endTag.pearNode = startTag;
			}
			startTag.childNodes = traverse(originNode, startTag, rawHtml);
			return startTag;
		}
	}
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
