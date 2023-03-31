import type { MLASTNode, MLASTText } from '@markuplint/ml-ast';

import { removeDeprecatedNode } from './remove-deprecated-node';
import tagSplitter from './tag-splitter';

import { getEndCol, getEndLine, uuid, walk } from '@markuplint/parser-utils';

export function flattenNodes(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodeTree: MLASTNode[],
	rawHtml: string,
	createLastText = true,
) {
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
			if (node.type !== 'endtag') {
				prevToken = node;
				continue;
			}
			const endTag = node;
			if (endTag.nodeName.toLowerCase() === 'body' && prevToken.type === 'text') {
				const prevWreckagesText = prevToken;
				if (prevWreckagesText) {
					const wreckages = tagSplitter(
						prevWreckagesText.raw,
						prevWreckagesText.startLine,
						prevWreckagesText.startCol,
					);
					if (wreckages.length && wreckages[0]) {
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
			if (lastNode.type === 'text') {
				// Correction for Parse5 AST
				// prev node: ? -> html
				lastNode.prevNode = lastNode.parentNode?.parentNode ?? lastNode.parentNode;
				if (lastNode.prevNode) {
					lastNode.prevNode.nextNode = lastNode;
				}
				// parent node: body -> null
				lastNode.parentNode = null;
				// next node: ? -> null
				lastNode.nextNode = null;
			} else if (createLastText) {
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
					const line = lastNode?.endLine ?? 0;
					const col = lastNode?.endCol ?? 0;
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
						type: 'text',
						parentNode: null,
						prevNode: lastNode,
						nextNode: null,
						isFragment: false,
						isGhost: false,
					};
					if (lastNode) {
						lastNode.nextNode = lastTextNode;
						if ((lastNode.type === 'starttag' || lastNode.type === 'endtag') && lastNode.pearNode) {
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
		const prevNode = result[result.length - 1] ?? null;
		if (node.type === 'text' && prevNode && prevNode.type === 'text') {
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
				((prevToken.type === 'endtag' && prevToken.nodeName.toLowerCase() === 'body') ||
					prevToken.type === 'doctype') &&
				node.type === 'text'
			) {
				const nextNode = prevToken.nextNode;
				prevToken.nextNode = node;
				if (prevToken.type === 'endtag' && prevToken.pearNode) {
					prevToken.pearNode.nextNode = node;
				}
				node.prevNode = prevToken;
				node.nextNode = nextNode;
				node.parentNode = prevToken.parentNode;
			}

			// EndTag
			if (node.type === 'starttag' && node.pearNode) {
				const endTag = node.pearNode;
				endTag.pearNode = node;
				endTag.prevNode = node.prevNode;
				endTag.nextNode = node.nextNode;
			}

			// Children
			if (node.type === 'text') {
				const parent = node.parentNode;
				if (parent && parent.type === 'starttag' && parent.nodeName.toLowerCase() === 'html') {
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

function arrayize(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodeTree: MLASTNode[],
	rawHtml: string,
) {
	const nodeOrders: MLASTNode[] = [];

	let prevLine = 1;
	let prevCol = 1;
	let currentEndOffset = 0;

	/**
	 * pushing list
	 */
	walk(nodeTree, node => {
		const diff = node.startOffset - currentEndOffset;
		if (diff > 0) {
			const html = rawHtml.slice(currentEndOffset, node.startOffset);

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
					type: 'text',
					parentNode: node.parentNode,
					prevNode: node.prevNode,
					nextNode: node,
					isFragment: false,
					isGhost: false,
				};
				node.prevNode = textNode;

				if (node.parentNode && node.parentNode.childNodes) {
					const newChildNodes = [...node.parentNode.childNodes];

					if (
						newChildNodes.some(child => {
							return (
								// Out of start offset
								textNode.endOffset < child.startOffset ||
								// Out of end offset
								child.endOffset < textNode.startOffset
							);
						})
					) {
						newChildNodes.push(textNode);
					}

					newChildNodes.sort((a, b) => a.startOffset - b.startOffset);

					node.parentNode.childNodes = newChildNodes;
				}

				nodeOrders.push(textNode);
			}
		}

		currentEndOffset = node.startOffset + node.raw.length;

		prevLine = node.endLine;
		prevCol = node.endCol;

		// for ghost nodes
		node.endOffset = node.endOffset ?? currentEndOffset;

		nodeOrders.push(node);
	});

	return nodeOrders.slice();
}
