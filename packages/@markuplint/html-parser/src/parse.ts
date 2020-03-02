import {
	MLASTDoctype,
	MLASTDocument,
	MLASTElementCloseTag,
	MLASTNode,
	MLASTNodeType,
	MLASTOmittedElement,
	MLASTParentNode,
	MLASTTag,
	MLASTText,
} from '@markuplint/ml-ast';
import UUID from 'uuid';
import { flattenNodes } from './flatten-nodes';
import getEndCol from './get-end-col';
import getEndLine from './get-end-line';
import isDocumentFragment from './is-document-fragment';
import parse5 from 'parse5';
import parseRawTag from './parse-raw-tag';

const P5_OPTIONS = { sourceCodeLocationInfo: true };

type ASTNode = P5Node | P5Document | P5Fragment;

export default function parse(html: string): MLASTDocument {
	const isFragment = isDocumentFragment(html);
	const doc = isFragment
		? (parse5.parseFragment(html, P5_OPTIONS) as P5Fragment)
		: (parse5.parse(html, P5_OPTIONS) as P5Document);

	const nodeList = flattenNodes(traverse(doc, null, html), html);

	return {
		nodeList,
		isFragment,
	};
}

function traverse(rootNode: ASTNode, parentNode: MLASTParentNode | null = null, rawHtml: string): MLASTNode[] {
	const nodeList: MLASTNode[] = [];

	const childNodes: P5Node[] = getChildNodes(rootNode);

	let prevNode: MLASTNode | null = null;
	for (const p5node of childNodes) {
		const node = nodeize(p5node, prevNode, parentNode, rawHtml);
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
): MLASTNode | null {
	const nextNode = null;
	if (!originNode.sourceCodeLocation) {
		const prevToken = prevNode || parentNode;
		const node: MLASTOmittedElement = {
			uuid: UUID.v4(),
			raw: '',
			startOffset: prevToken ? prevToken.endOffset : 0,
			endOffset: prevToken ? prevToken.endOffset : 0,
			startLine: prevToken ? prevToken.endLine : 0,
			endLine: prevToken ? prevToken.endLine : 0,
			startCol: prevToken ? prevToken.endCol : 0,
			endCol: prevToken ? prevToken.endCol : 0,
			nodeName: originNode.nodeName,
			type: MLASTNodeType.OmittedTag,
			namespace: originNode.namespaceURI,
			parentNode,
			prevNode,
			nextNode,
			isFragment: false,
			isGhost: true,
		};
		node.childNodes = traverse(originNode, node, rawHtml);
		return node;
	}
	const { startOffset, endOffset, startLine, endLine, startCol, endCol } = originNode.sourceCodeLocation;
	const raw = rawHtml.slice(startOffset, endOffset || startOffset);
	switch (originNode.nodeName) {
		case '#documentType': {
			return {
				uuid: UUID.v4(),
				raw,
				// @ts-ignore
				name: originNode.name || '',
				// @ts-ignore
				publicId: originNode.publicId || '',
				// @ts-ignore
				systemId: originNode.systemId || '',
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
		case '#text': {
			const node: MLASTText = {
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
			};
			return node;
		}
		case '#comment': {
			return {
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
			};
		}
		default: {
			const tagLoc = originNode.sourceCodeLocation.startTag;
			const startTagRaw = originNode.sourceCodeLocation.startTag
				? rawHtml.slice(tagLoc.startOffset, tagLoc.endOffset)
				: rawHtml.slice(startOffset, endOffset || startOffset);
			const tagTokens = parseRawTag(startTagRaw, startLine, startCol, startOffset);
			const tagName = tagTokens.tagName;
			let endTag: MLASTElementCloseTag | null = null;
			const endTagLoc = originNode.sourceCodeLocation.endTag;
			if (endTagLoc) {
				const endTagRaw = rawHtml.slice(endTagLoc.startOffset, endTagLoc.endOffset);
				const endTagTokens = parseRawTag(
					endTagRaw,
					endTagLoc.startLine,
					endTagLoc.startCol,
					endTagLoc.startOffset,
				);
				const endTagName = endTagTokens.tagName;
				endTag = {
					uuid: UUID.v4(),
					raw: endTagRaw,
					startOffset: endTagLoc.startOffset,
					endOffset: endTagLoc.endOffset,
					startLine: endTagLoc.startLine,
					endLine: endTagLoc.endLine,
					startCol: endTagLoc.startCol,
					endCol: endTagLoc.endCol,
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
				};
			}
			const startTag: MLASTTag = {
				uuid: UUID.v4(),
				raw: startTagRaw,
				startOffset,
				endOffset: startOffset + startTagRaw.length,
				startLine,
				endLine: getEndLine(startTagRaw, startLine),
				startCol,
				endCol: getEndCol(startTagRaw, startCol),
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
			};
			if (endTag) {
				endTag.pearNode = startTag;
			}
			startTag.childNodes = traverse(originNode, startTag, rawHtml);
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
