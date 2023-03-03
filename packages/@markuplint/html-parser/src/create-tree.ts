import type {
	MLASTDoctype,
	MLASTElementCloseTag,
	MLASTNode,
	MLASTElement,
	MLASTParentNode,
	MLASTTag,
	MLASTText,
} from '@markuplint/ml-ast';
import type { ParserOptions } from 'parse5';
import type { ElementLocation, Location } from 'parse5/dist/common/token';
import type {
	CommentNode,
	DefaultTreeAdapterMap,
	Document,
	DocumentFragment,
	Element,
	Node,
	TextNode,
} from 'parse5/dist/tree-adapters/default';

import { detectElementType, getEndCol, getEndLine, sliceFragment, uuid } from '@markuplint/parser-utils';
import { parse, parseFragment } from 'parse5';

import parseRawTag from './parse-raw-tag';

interface TraversalNode {
	childNodes?: P5Node[];
	content?: P5Fragment;
}

type P5Node = Node & TraversalNode;
type P5LocatableNode = (TextNode | Element | CommentNode) & TraversalNode;
type P5Document = Document & TraversalNode;
type P5Fragment = DocumentFragment & TraversalNode;

const P5_OPTIONS: ParserOptions<DefaultTreeAdapterMap> = {
	scriptingEnabled: false,
	sourceCodeLocationInfo: true,
};

export function createTree(
	rawCode: string,
	isFragment: boolean,
	offsetOffset: number,
	offsetLine: number,
	offsetColumn: number,
) {
	const doc = isFragment
		? (parseFragment(rawCode, P5_OPTIONS) as P5Fragment)
		: (parse(rawCode, P5_OPTIONS) as P5Document);
	return createTreeRecursive(doc, null, rawCode, offsetOffset, offsetLine, offsetColumn);
}

function createTreeRecursive(
	rootNode: P5Node,
	parentNode: MLASTParentNode | null,
	rawHtml: string,
	offsetOffset: number,
	offsetLine: number,
	offsetColumn: number,
): MLASTNode[] {
	const nodeList: MLASTNode[] = [];

	const childNodes = getChildNodes(rootNode);

	let prevNode: MLASTNode | null = null;
	for (const p5node of childNodes) {
		const node = nodeize(p5node, prevNode, parentNode, rawHtml, offsetOffset, offsetLine, offsetColumn);
		if (!node) {
			continue;
		}
		if (prevNode) {
			if (node.type !== 'endtag') {
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
	const location = getLocation(originNode);
	if (!location) {
		const prevToken = prevNode || parentNode;
		const startOffset = prevToken ? prevToken.endOffset : 0;
		const endOffset = prevToken ? prevToken.endOffset : 0;
		const startLine = prevToken ? prevToken.endLine : 0;
		const endLine = prevToken ? prevToken.endLine : 0;
		const startCol = prevToken ? prevToken.endCol : 0;
		const endCol = prevToken ? prevToken.endCol : 0;
		const node: MLASTElement = {
			uuid: uuid(),
			raw: '',
			startOffset: startOffset + offsetOffset,
			endOffset: endOffset + offsetOffset,
			startLine: startLine + offsetLine,
			endLine: endLine + offsetLine,
			startCol: startCol + (startLine === 1 ? offsetColumn : 0),
			endCol: endCol + (endLine === 1 ? offsetColumn : 0),
			nodeName: originNode.nodeName,
			type: 'starttag',
			namespace: getNamespace(originNode),
			elementType: 'html',
			attributes: [],
			hasSpreadAttr: false,
			pearNode: null,
			tagCloseChar: '',
			tagOpenChar: '',
			parentNode,
			prevNode,
			nextNode,
			isFragment: false,
			isGhost: true,
		};
		node.childNodes = createTreeRecursive(originNode, node, rawHtml, offsetOffset, offsetLine, offsetColumn);
		return node;
	}
	const { startOffset, endOffset, startLine, endLine, startCol, endCol } = location;
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
				type: 'doctype',
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
				type: 'text',
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
				type: 'comment',
				parentNode,
				prevNode,
				nextNode,
				isFragment: false,
				isGhost: false,
			};
		}
		default: {
			const tagLoc = 'startTag' in location ? location.startTag : null;
			const startTagRaw = tagLoc
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
			let endTagLoc = 'endTag' in location ? location.endTag : null;

			/**
			 * Patch: Create endTag for SVG Element
			 * @see https://github.com/inikulin/parse5/issues/352
			 */
			if (
				!endTagLoc &&
				'namespaceURI' in originNode &&
				originNode.namespaceURI === 'http://www.w3.org/2000/svg'
			) {
				const belowRawHTMLFromStartTagEnd = rawHtml.slice(location.endOffset);
				const endTagMatched = belowRawHTMLFromStartTagEnd.match(new RegExp(`^</\\s*${tagName}[^>]*>`, 'm'));
				const endTag = endTagMatched && endTagMatched[0];
				if (endTag) {
					endTagLoc = sliceFragment(rawHtml, location.endOffset, location.endOffset + endTag.length);
				}
			}

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
					type: 'endtag',
					namespace: getNamespace(originNode),
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
				type: 'starttag',
				namespace: getNamespace(originNode),
				elementType: detectElementType(tagName),
				attributes: tagTokens.attrs,
				hasSpreadAttr: false,
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
			startTag.childNodes = createTreeRecursive(
				originNode,
				startTag,
				rawHtml,
				offsetOffset,
				offsetLine,
				offsetColumn,
			);
			return startTag;
		}
	}
}

/**
 * getChildNodes
 *
 * - If node has "content" property then parse as document fragment.
 */
function getChildNodes(rootNode: P5Node | P5Document | P5Fragment) {
	return rootNode.content ? rootNode.content.childNodes : rootNode.childNodes || [];
}

function hasLocation(node: P5Node): node is P5LocatableNode {
	return 'sourceCodeLocation' in node;
}

function getLocation(node: P5Node): Location | ElementLocation | null {
	if (hasLocation(node) && node.sourceCodeLocation) {
		return node.sourceCodeLocation;
	}
	return null;
}

function getNamespace(node: P5Node) {
	if ('namespaceURI' in node) {
		return node.namespaceURI;
	}
	return '';
}
