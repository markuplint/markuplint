import {
	MLASTDoctype,
	MLASTDocument,
	MLASTElement,
	MLASTElementCloseTag,
	MLASTNode,
	MLASTNodeType,
	MLASTOmittedElement,
	MLASTParentNode,
	MLASTTag,
	MLASTText,
} from '@markuplint/ml-ast';
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

	const nodeTree: MLASTNode[] = traverse(doc, null, html, 0);
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
	depth: number,
): MLASTNode | null {
	const nextNode = null;
	if (!p5node.sourceCodeLocation) {
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
			nodeName: p5node.nodeName,
			type: MLASTNodeType.OmittedTag,
			namespace: p5node.namespaceURI,
			parentNode,
			prevNode,
			nextNode,
			isFragment: false,
			isGhost: true,
		};
		node.childNodes = traverse(p5node, node, rawHtml, depth);
		return node;
	}
	const { startOffset, endOffset, startLine, endLine, startCol, endCol } = p5node.sourceCodeLocation;
	const raw = rawHtml.slice(startOffset, endOffset || startOffset);
	switch (p5node.nodeName) {
		case '#documentType': {
			return {
				uuid: UUID.v4(),
				raw,
				// @ts-ignore
				name: p5node.name || '',
				// @ts-ignore
				publicId: p5node.publicId || '',
				// @ts-ignore
				systemId: p5node.systemId || '',
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
			let endTag: MLASTElementCloseTag | null = null;
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
			startTag.childNodes = traverse(p5node, startTag, rawHtml, depth);
			return startTag;
		}
	}
}

function traverse(
	rootNode: P5Node | P5Document | P5Fragment,
	parentNode: MLASTParentNode | null = null,
	rawHtml: string,
	depth: number,
): MLASTNode[] {
	depth += 1;
	const nodeList: MLASTNode[] = [];

	const childNodes: P5Node[] = getChildNodes(rootNode);

	let prevNode: MLASTNode | null = null;
	for (const p5node of childNodes) {
		const node = nodeize(p5node, prevNode, parentNode, rawHtml, depth);
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

				if (node.parentNode && node.parentNode.childNodes) {
					node.parentNode.childNodes.unshift(textNode);
				}
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

	{
		/**
		 * Correction prev/next/parent
		 */
		let prevToken: MLASTNode | null = null;
		for (const node of nodeOrders) {
			if (!prevToken) {
				prevToken = node;
				continue;
			}
			if (node.type !== MLASTNodeType.EndTag) {
				prevToken = node;
				continue;
			}
			const endTag = node;
			if (endTag.nodeName.toLowerCase() === 'body' && prevToken.type === MLASTNodeType.Text) {
				const prevWreckagesText = prevToken;
				if (prevWreckagesText) {
					const wreckages = tagSplitter(
						prevWreckagesText.raw,
						prevWreckagesText.startLine,
						prevWreckagesText.startCol,
					);
					if (wreckages.length) {
						// console.log('wreckages\n', wreckages);
						const lastText = wreckages[0];
						const raw = lastText.raw;
						const startLine = lastText.line;
						const startCol = lastText.col;
						prevWreckagesText.raw = raw;
						prevWreckagesText.endOffset = prevWreckagesText.startOffset + raw.length;
						prevWreckagesText.startLine = startLine;
						prevWreckagesText.endLine = getEndLine(raw, startLine);
						prevWreckagesText.startCol = startCol;
						prevWreckagesText.endCol = getEndCol(raw, startCol);
					}
				}
			}
		}
	}

	/**
	 * sorting
	 */
	nodeOrders.sort((a, b) => {
		if (a.isGhost || b.isGhost) {
			return 0;
		}
		return a.startOffset - b.startOffset;
	});

	{
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
	}

	{
		/**
		 * getting last node
		 */
		let lastNode: MLASTNode | null = null;
		for (const node of nodeOrders) {
			if (node.isGhost) {
				continue;
			}
			lastNode = node;
		}

		if (lastNode) {
			if (lastNode.type === MLASTNodeType.Text) {
				// Correction for Parse5 AST
				// prev node: ? -> html
				lastNode.prevNode = lastNode.parentNode && lastNode.parentNode.parentNode;
				if (lastNode.prevNode) {
					lastNode.prevNode.nextNode = lastNode;
				}
				// parent node: body -> null
				lastNode.parentNode = null;
				// next node: ? -> null
				lastNode.nextNode = null;
			} else {
				/**
				 * create Last spaces
				 */
				let lastOffset = 0;
				nodeOrders.forEach((node, i) => {
					lastOffset = Math.max(node.endOffset, lastOffset);
				});
				// console.log(lastOffset);
				const lastTextContent = rawHtml.slice(lastOffset);
				// console.log(`"${lastTextContent}"`);
				if (lastTextContent) {
					const uuid = UUID.v4();
					const line = lastNode ? lastNode.endLine : 0;
					const col = lastNode ? lastNode.endCol : 0;
					const lastTextNode: MLASTText = {
						uuid,
						raw: lastTextContent,
						startOffset: lastOffset,
						endOffset: lastOffset + lastTextContent.length,
						startLine: line,
						endLine: getEndLine(lastTextContent, line),
						startCol: col,
						endCol: getEndCol(lastTextContent, col),
						nodeName: '#text',
						type: MLASTNodeType.Text,
						parentNode: null,
						prevNode: lastNode,
						nextNode: null,
						isFragment: false,
						isGhost: false,
					};
					if (lastNode) {
						lastNode.nextNode = lastTextNode;
						if (
							(lastNode.type === MLASTNodeType.StartTag || lastNode.type === MLASTNodeType.EndTag) &&
							lastNode.pearNode
						) {
							lastNode.pearNode.nextNode = lastTextNode;
						}
					}
					nodeOrders.push(lastTextNode);
				}
			}
		}
	}

	/**
	 * concat text nodes
	 */
	const result: MLASTNode[] = [];
	nodeOrders.forEach(node => {
		const prevNode = result[result.length - 1] || null;
		if (node.type === MLASTNodeType.Text && prevNode && prevNode.type === MLASTNodeType.Text) {
			prevNode.raw = prevNode.raw + node.raw;
			prevNode.endOffset = node.endOffset;
			prevNode.endLine = node.endLine;
			prevNode.endCol = node.endCol;
			prevNode.nextNode = node.nextNode;
			if (prevNode.parentNode && prevNode.parentNode.childNodes) {
				prevNode.parentNode.childNodes = prevNode.parentNode.childNodes.filter(n => n.uuid !== node.uuid);
			}
			if (node.nextNode) {
				node.nextNode.prevNode = prevNode;
			}
			return;
		}
		result.push(node);
	});

	{
		/**
		 * Correction prev/next/parent
		 */
		let prevToken: MLASTNode | null = null;
		for (const node of result) {
			if (!prevToken) {
				prevToken = node;
				continue;
			}

			if (
				((prevToken.type === MLASTNodeType.EndTag && prevToken.nodeName.toLowerCase() === 'body') ||
					prevToken.type === MLASTNodeType.Doctype) &&
				node.type === MLASTNodeType.Text
			) {
				const nextNode = prevToken.nextNode;
				prevToken.nextNode = node;
				if (prevToken.type === MLASTNodeType.EndTag && prevToken.pearNode) {
					prevToken.pearNode.nextNode = node;
				}
				node.prevNode = prevToken;
				node.nextNode = nextNode;
				node.parentNode = prevToken.parentNode;
			}

			// EndTag
			if (node.type === MLASTNodeType.StartTag && node.pearNode) {
				const endTag = node.pearNode;
				endTag.pearNode = node;
				endTag.prevNode = node.prevNode;
				endTag.nextNode = node.nextNode;
			}

			// Children
			if (node.type === MLASTNodeType.Text) {
				const parent = node.parentNode;
				if (parent && parent.type === MLASTNodeType.StartTag && parent.nodeName.toLowerCase() === 'html') {
					if (parent.childNodes && !parent.childNodes.some(n => n.uuid === node.uuid)) {
						parent.childNodes.push(node);
					}
				}
			}

			prevToken = node;
		}
	}

	// console.log(nodeOrders.map((n, i) => `${i}: ${n.raw.trim()}`));

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

interface TraversalNode {
	childNodes?: P5Node[];
	content?: P5Fragment;
}

type P5Node = parse5.DefaultTreeElement & TraversalNode;
type P5Document = parse5.DefaultTreeDocument & TraversalNode;
type P5Fragment = parse5.DefaultTreeDocumentFragment & TraversalNode;
