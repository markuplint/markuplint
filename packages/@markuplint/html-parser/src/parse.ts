import {
	MLASTDoctype,
	MLASTElementCloseTag,
	MLASTNode,
	MLASTNodeType,
	MLASTOmittedElement,
	MLASTParentNode,
	MLASTTag,
	MLASTText,
	Parse,
	getEndCol,
	getEndLine,
	uuid,
} from '@markuplint/ml-ast';
import { flattenNodes } from './flatten-nodes';
import isDocumentFragment from './is-document-fragment';
import parse5 from 'parse5';
import parseRawTag from './parse-raw-tag';

const P5_OPTIONS = { sourceCodeLocationInfo: true };

type ASTNode = P5Node | P5Document | P5Fragment;

export const parse: Parse = (rawCode, offsetOffset = 0, offsetLine = 0, offsetColumn = 0) => {
	const isFragment = isDocumentFragment(rawCode);
	const doc = isFragment
		? (parse5.parseFragment(rawCode, P5_OPTIONS) as P5Fragment)
		: (parse5.parse(rawCode, P5_OPTIONS) as P5Document);

	const nodeList = flattenNodes(traverse(doc, null, rawCode, offsetOffset, offsetLine, offsetColumn), rawCode);

	return {
		nodeList,
		isFragment,
	};
};

function traverse(
	rootNode: ASTNode,
	parentNode: MLASTParentNode | null,
	rawHtml: string,
	offsetOffset: number,
	offsetLine: number,
	offsetColumn: number,
): MLASTNode[] {
	const nodeList: MLASTNode[] = [];

	const childNodes: P5Node[] = getChildNodes(rootNode);

	let prevNode: MLASTNode | null = null;
	for (const p5node of childNodes) {
		const node = nodeize(p5node, prevNode, parentNode, rawHtml, offsetOffset, offsetLine, offsetColumn);
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
	originNode: P5Node,
	prevNode: MLASTNode | null,
	parentNode: MLASTParentNode | null,
	rawHtml: string,
	offsetOffset: number,
	offsetLine: number,
	offsetColumn: number,
): MLASTNode | null {
	const nextNode = null;
	if (!originNode.sourceCodeLocation) {
		const prevToken = prevNode || parentNode;
		const startOffset = prevToken ? prevToken.endOffset : 0;
		const endOffset = prevToken ? prevToken.endOffset : 0;
		const startLine = prevToken ? prevToken.endLine : 0;
		const endLine = prevToken ? prevToken.endLine : 0;
		const startCol = prevToken ? prevToken.endCol : 0;
		const endCol = prevToken ? prevToken.endCol : 0;
		const node: MLASTOmittedElement = {
			uuid: uuid(),
			raw: '',
			startOffset: startOffset + offsetOffset,
			endOffset: endOffset + offsetOffset,
			startLine: startLine + offsetLine,
			endLine: endLine + offsetLine,
			startCol: startCol + (startLine === 1 ? offsetColumn : 0),
			endCol: endCol + (endLine === 1 ? offsetColumn : 0),
			nodeName: originNode.nodeName,
			type: MLASTNodeType.OmittedTag,
			namespace: originNode.namespaceURI,
			parentNode,
			prevNode,
			nextNode,
			isFragment: false,
			isGhost: true,
		};
		node.childNodes = traverse(originNode, node, rawHtml, offsetOffset, offsetLine, offsetColumn);
		return node;
	}
	const { startOffset, endOffset, startLine, endLine, startCol, endCol } = originNode.sourceCodeLocation;
	const raw = rawHtml.slice(startOffset, endOffset || startOffset);
	switch (originNode.nodeName) {
		case '#documentType': {
			return {
				uuid: uuid(),
				raw,
				// @ts-ignore
				name: originNode.name || '',
				// @ts-ignore
				publicId: originNode.publicId || '',
				// @ts-ignore
				systemId: originNode.systemId || '',
				startOffset: startOffset + offsetOffset,
				endOffset: endOffset + offsetOffset,
				startLine: startLine + offsetLine,
				endLine: endLine + offsetLine,
				startCol: startCol + (startLine === 1 ? offsetColumn : 0),
				endCol: endCol + (endLine === 1 ? offsetColumn : 0),
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
		case '#text': {
			const node: MLASTText = {
				uuid: uuid(),
				raw,
				startOffset: startOffset + offsetOffset,
				endOffset: endOffset + offsetOffset,
				startLine: startLine + offsetLine,
				endLine: endLine + offsetLine,
				startCol: startCol + (startLine === 1 ? offsetColumn : 0),
				endCol: endCol + (endLine === 1 ? offsetColumn : 0),
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
		case '#comment': {
			return {
				uuid: uuid(),
				raw,
				startOffset: startOffset + offsetOffset,
				endOffset: endOffset + offsetOffset,
				startLine: startLine + offsetLine,
				endLine: endLine + offsetLine,
				startCol: startCol + (startLine === 1 ? offsetColumn : 0),
				endCol: endCol + (endLine === 1 ? offsetColumn : 0),
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
			const tagLoc = originNode.sourceCodeLocation.startTag;
			const startTagRaw = originNode.sourceCodeLocation.startTag
				? rawHtml.slice(tagLoc.startOffset, tagLoc.endOffset)
				: rawHtml.slice(startOffset, endOffset || startOffset);
			const tagTokens = parseRawTag(
				startTagRaw,
				startLine,
				startCol,
				startOffset,
				offsetOffset,
				offsetLine,
				offsetColumn,
			);
			const tagName = tagTokens.tagName;
			let endTag: MLASTElementCloseTag | null = null;
			const endTagLoc = originNode.sourceCodeLocation.endTag;
			if (endTagLoc) {
				const { startOffset, endOffset, startLine, endLine, startCol, endCol } = endTagLoc;
				const endTagRaw = rawHtml.slice(startOffset, endOffset);
				const endTagTokens = parseRawTag(
					endTagRaw,
					startLine,
					startCol,
					startOffset,
					offsetOffset,
					offsetLine,
					offsetColumn,
				);
				const endTagName = endTagTokens.tagName;
				endTag = {
					uuid: uuid(),
					raw: endTagRaw,
					startOffset: startOffset + offsetOffset,
					endOffset: endOffset + offsetOffset,
					startLine: startLine + offsetLine,
					endLine: endLine + offsetLine,
					startCol: startCol + (startLine === 1 ? offsetColumn : 0),
					endCol: endCol + (endLine === 1 ? offsetColumn : 0),
					nodeName: endTagName,
					type: MLASTNodeType.EndTag,
					namespace: originNode.namespaceURI,
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
			const _endOffset = startOffset + startTagRaw.length;
			const _endLine = getEndLine(startTagRaw, startLine);
			const _endCol = getEndCol(startTagRaw, startCol);
			const startTag: MLASTTag = {
				uuid: uuid(),
				raw: startTagRaw,
				startOffset: startOffset + offsetOffset,
				endOffset: _endOffset + offsetOffset,
				startLine: startLine + offsetLine,
				endLine: _endLine + offsetLine,
				startCol: startCol + (startLine === 1 ? offsetColumn : 0),
				endCol: _endCol + (startLine === _endLine ? offsetColumn : 0),
				nodeName: tagName,
				type: MLASTNodeType.StartTag,
				namespace: originNode.namespaceURI,
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
			startTag.childNodes = traverse(originNode, startTag, rawHtml, offsetOffset, offsetLine, offsetColumn);
			return startTag;
		}
	}
}

/**
 * getChildNodes
 *
 * - If node has "content" property then parse as document fragment.
 * - If node is <noscript> then that childNodes is a TextNode. But parse as document fragment it for disabled script.
 */
function getChildNodes(rootNode: P5Node | P5Document | P5Fragment): P5Node[] {
	if (rootNode.nodeName === 'noscript') {
		const textNode = rootNode.childNodes[0];
		if (!textNode || textNode.nodeName !== '#text') {
			return [];
		}
		// @ts-ignore
		const html: string = textNode.value;

		// @ts-ignore
		const { startOffset, startLine, startCol } = rootNode.sourceCodeLocation;

		const breakCount = startLine - 1;
		const indentWidth = startCol - 1;
		const spaces =
			' '.repeat(startOffset - Math.max(breakCount, 0) - Math.max(indentWidth, 0)) +
			'\n'.repeat(breakCount) +
			' '.repeat(indentWidth);

		const fragment = parse5.parseFragment(`${spaces}<x-script>${html}</x-script>`, P5_OPTIONS) as P5Fragment;
		const childNodes = fragment.childNodes[spaces ? 1 : 0].childNodes;

		return childNodes;
	}
	return rootNode.content ? rootNode.content.childNodes : rootNode.childNodes;
}

interface TraversalNode {
	childNodes?: P5Node[];
	content?: P5Fragment;
}

type P5Node = parse5.DefaultTreeElement & TraversalNode;
type P5Document = parse5.DefaultTreeDocument & TraversalNode;
type P5Fragment = parse5.DefaultTreeDocumentFragment & TraversalNode;
