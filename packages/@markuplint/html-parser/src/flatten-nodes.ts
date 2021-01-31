import { MLASTNode, MLASTNodeType, MLASTText, getEndCol, getEndLine, uuid, walk } from '@markuplint/ml-ast';
import { removeDeprecatedNode } from './remove-deprecated-node';
import tagSplitter from './tag-splitter';

export function flattenNodes(nodeTree: MLASTNode[], rawHtml: string) {
	const nodeOrders: MLASTNode[] = arrayize(nodeTree, rawHtml);

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

	removeDeprecatedNode(nodeOrders);

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
					const line = lastNode ? lastNode.endLine : 0;
					const col = lastNode ? lastNode.endCol : 0;
					const lastTextNode: MLASTText = {
						uuid: uuid(),
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

function arrayize(nodeTree: MLASTNode[], rawHtml: string) {
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
				const spaces = html;
				const textNode: MLASTText = {
					uuid: uuid(),
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

	return nodeOrders;
}
