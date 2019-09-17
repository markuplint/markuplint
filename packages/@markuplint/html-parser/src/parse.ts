import {
	MLASTAbstructNode,
	MLASTDocument,
	MLASTElement,
	MLASTInvalidNode,
	MLASTNode,
	MLASTNodeType,
	MLASTOmittedElement,
	MLASTParentNode,
	MLASTTag,
	MLASTText,
} from '@markuplint/ml-ast/';
import UUID from 'uuid';
import getEndCol from './get-end-col';
import getEndLine from './get-end-line';
import isDocumentFragment from './is-document-fragment';
import parse5 from 'parse5';
import parseRawTag from './parse-raw-tag';
import tagSplitter from './tag-splitter';

const P5_OPTIONS = { sourceCodeLocationInfo: true };

export default function parse(html: string) {
	const isFragment = isDocumentFragment(html);
	const doc = isFragment
		? (parse5.parseFragment(html, P5_OPTIONS) as P5Fragment)
		: (parse5.parse(html, P5_OPTIONS) as P5Document);

	const nodeTree: MLASTNode[] = traverse(doc, null, html);
	// console.dir(nodeTree);

	const nodeList = flattenNodes(nodeTree, html);
	// console.dir(nodeList);

	const parsedDoc: MLASTDocument = {
		nodeList,
		isFragment,
	};

	return parsedDoc;
}

function nodeize(
	p5node: P5Node,
	prevNode: MLASTNode | null,
	parentNode: MLASTParentNode | null,
	rawHtml: string,
): MLASTNode[] {
	const nodes: MLASTNode[] = [];
	prevNode = prevNode || parentNode;
	if (!p5node.sourceCodeLocation) {
		const node: MLASTOmittedElement = {
			uuid: UUID.v4(),
			raw: '',
			startOffset: prevNode ? prevNode.endOffset : 0,
			endOffset: prevNode ? prevNode.endOffset : 0,
			startLine: prevNode ? prevNode.endLine : 0,
			endLine: prevNode ? prevNode.endLine : 0,
			startCol: prevNode ? prevNode.endCol : 0,
			endCol: prevNode ? prevNode.endCol : 0,
			nodeName: p5node.nodeName,
			type: MLASTNodeType.OmittedTag,
			namespace: p5node.namespaceURI,
			parentNode,
			prevNode,
			nextNode: null,
			isFragment: false,
			isGhost: true,
		};
		node.childNodes = traverse(p5node, node, rawHtml);
		nodes.push(node);
		return nodes;
	}
	const { startOffset, endOffset, startLine, endLine, startCol, endCol } = p5node.sourceCodeLocation;
	const raw = rawHtml.slice(startOffset, endOffset || startOffset);
	const nextNode = null;
	// console.log({ name: p5node.nodeName, raw, l: endOffset - startOffset });
	switch (p5node.nodeName) {
		case '#documentType': {
			nodes.push({
				uuid: UUID.v4(),
				raw,
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
				nextNode,
				isFragment: false,
				isGhost: false,
			});
			break;
		}
		case '#text': {
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
				const tokens = tagSplitter(
					raw,
					p5node.sourceCodeLocation.startLine,
					p5node.sourceCodeLocation.startCol,
				);
				let tokenStartOffset = startOffset;
				for (const token of tokens) {
					const tokenEndOffset = tokenStartOffset + token.raw.length;

					if (token.type === 'text') {
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
					} else {
						const node: MLASTInvalidNode = {
							uuid: UUID.v4(),
							raw: token.raw,
							startOffset: tokenStartOffset,
							endOffset: tokenEndOffset,
							startLine: token.line,
							endLine: getEndLine(token.raw, token.line),
							startCol: token.col,
							endCol: getEndCol(token.raw, token.col),
							nodeName: '#invalid',
							type: MLASTNodeType.InvalidNode,
							parentNode,
							prevNode,
							nextNode,
							isFragment: false,
							isGhost: false,
						};
						nodes.push(node);
						prevNode = node;
					}
					tokenStartOffset = tokenEndOffset;
				}
			}
			break;
		}
		case '#comment': {
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
		default: {
			const tagLoc = p5node.sourceCodeLocation.startTag;
			const startTagRaw = p5node.sourceCodeLocation.startTag
				? rawHtml.slice(tagLoc.startOffset, tagLoc.endOffset)
				: rawHtml.slice(startOffset, endOffset || startOffset);
			const tagTokens = parseRawTag(
				startTagRaw,
				p5node.sourceCodeLocation.startLine,
				p5node.sourceCodeLocation.startCol,
				p5node.sourceCodeLocation.startOffset,
			);
			const tagName = tagTokens.tagName;
			let endTag: MLASTTag | null = null;
			const endTagLoc = p5node.sourceCodeLocation.endTag;
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
					namespace: p5node.namespaceURI,
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
				namespace: p5node.namespaceURI,
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
			startTag.childNodes = traverse(p5node, startTag, rawHtml);
			nodes.push(startTag);
		}
	}
	return nodes;
}

function traverse(
	rootNode: P5Node | P5Document | P5Fragment,
	parentNode: MLASTParentNode | null = null,
	rawHtml: string,
): MLASTNode[] {
	const nodeList: MLASTNode[] = [];

	const childNodes: P5Node[] = getChildNodes(rootNode);

	let prev: MLASTNode | null = null;
	for (const p5node of childNodes) {
		const nodes: MLASTNode[] = nodeize(p5node, prev, parentNode, rawHtml);
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

	let prevLine = 1;
	let prevCol = 1;
	let currentStartOffset = 0;
	let currentEndOffset = 0;

	/**
	 * pushing list
	 */
	walk(nodeTree, node => {
		currentStartOffset = node.startOffset;

		const diff = currentStartOffset - currentEndOffset;
		if (diff > 0) {
			const html = rawHtml.slice(currentEndOffset, currentStartOffset);
			// console.log(`diff: ${diff} => "${spaces.replace(/\n/g, '⏎').replace(/\t/g, '→').replace(/\s/g, '␣')}"`);

			/**
			 * first white spaces
			 */
			if (/^\s+$/.test(html)) {
				const uuid = UUID.v4();
				const spaces = html;
				const textNode: MLASTText = {
					uuid,
					raw: spaces,
					startOffset: currentEndOffset,
					endOffset: currentEndOffset + spaces.length,
					startLine: prevLine,
					endLine: getEndLine(spaces, prevLine),
					startCol: prevCol,
					endCol: getEndCol(spaces, prevCol),
					nodeName: '#text',
					type: MLASTNodeType.Text,
					parentNode: node.parentNode,
					prevNode: node.prevNode,
					nextNode: node,
					isFragment: false,
					isGhost: false,
				};
				node.prevNode = textNode;

				nodeOrders.push(textNode);
			} else if (/^<\/[a-z0-9][a-z0-9:-]*>$/i.test(html)) {
				// close tag
			} else {
				// never
			}
		}

		currentEndOffset = currentStartOffset + node.raw.length;

		prevLine = node.endLine;
		prevCol = node.endCol;

		// for ghost nodes
		node.startOffset = node.startOffset || currentStartOffset;
		node.endOffset = node.endOffset || currentEndOffset;

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
	 * getting last node
	 */
	let lastNode: MLASTAbstructNode | null = null;
	for (const node of nodeOrders) {
		if (node.isGhost) {
			continue;
		}
		lastNode = node;
	}

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
			const iA = stack[id];
			const iB = i;
			const a = nodeOrders[iA];
			const b = node;
			if (isInvalidNode(a) && isInvalidNode(b)) {
				removeIndexes.push(iB);
			} else if (isInvalidNode(a)) {
				removeIndexes.push(iA);
			} else {
				removeIndexes.push(iB);
			}
		}
		stack[id] = i;
	});
	let r = nodeOrders.length;
	while (r--) {
		if (removeIndexes.includes(r)) {
			nodeOrders.splice(r, 1);
		}
	}

	/**
	 * create Last spaces
	 */
	nodeOrders.forEach((node, i) => {
		if (i === nodeOrders.length - 1) {
			const lastTextContent = rawHtml.slice(node.endOffset);
			if (!lastTextContent) {
				return;
			}
			const uuid = UUID.v4();
			const line = lastNode ? lastNode.endLine : 0;
			const col = lastNode ? lastNode.endCol : 0;
			const lastTextNode: MLASTText = {
				uuid,
				raw: lastTextContent,
				startOffset: node.endOffset,
				endOffset: node.endOffset + lastTextContent.length,
				startLine: line,
				endLine: getEndLine(lastTextContent, line),
				startCol: col,
				endCol: getEndCol(lastTextContent, col),
				nodeName: '#text',
				type: MLASTNodeType.Text,
				parentNode: node.parentNode || null,
				prevNode: node,
				nextNode: null,
				isFragment: false,
				isGhost: false,
			};
			if (lastNode) {
				lastNode.nextNode = lastTextNode;
			}
			nodeOrders.push(lastTextNode);
		}
	});

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

function isInvalidNode(node: MLASTAbstructNode) {
	return node.type === MLASTNodeType.InvalidNode;
}

interface TraversalNode {
	childNodes?: P5Node[];
	content?: P5Fragment;
}

type P5Node = parse5.DefaultTreeElement & TraversalNode;
type P5Document = parse5.DefaultTreeDocument & TraversalNode;
type P5Fragment = parse5.DefaultTreeDocumentFragment & TraversalNode;
type P5DocumentType = parse5.DefaultTreeDocumentType;

interface SortableNode {
	node: MLASTAbstructNode;
	startOffset: number;
	endOffset: number;
}
