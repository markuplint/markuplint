import parse5 from 'parse5';

import { MLASTNode, MLASTNodeType, MLASTTag } from '@markuplint/ml-ast';

import parseRawTag from './parse-raw-tag';
import tagSplitter from './tag-splitter';

export default function parser(html: string) {
	const isFragment = isDocumentFragment(html);
	const p5options = { sourceCodeLocationInfo: true };
	const doc = isFragment
		? (parse5.parseFragment(html, p5options) as P5Fragment)
		: (parse5.parse(html, p5options) as P5Document);

	console.log(doc);

	const nodeTree: MLASTNode[] = traverse(doc, null, html);

	return nodeTree;
}

export function isDocumentFragment(html: string) {
	return !/^\s*(<!doctype html(?:\s*.+)?>|<html(?:\s|>))/im.test(html);
}

function nodeize(
	p5node: P5Node,
	prevNode: MLASTNode | null,
	parentNode: MLASTNode | null,
	rawHtml: string,
): MLASTNode[] {
	const nodes: MLASTNode[] = [];
	if (!p5node.sourceCodeLocation) {
		const node: MLASTTag = {
			raw: '',
			startOffset: 0,
			endOffset: 0,
			startLine: 0,
			endLine: 0,
			startCol: 0,
			endCol: 0,
			nodeName: p5node.nodeName,
			type: MLASTNodeType.OmittedTag,
			namespace: p5node.namespaceURI,
			attributes: [],
			parentNode,
			prevNode,
			nextNode: null,
			pearNode: null,
			isFragment: false,
			isGhost: true,
		};
		nodes.push(node);
		return nodes;
	}
	const {
		startOffset,
		endOffset,
		startLine,
		endLine,
		startCol,
		endCol,
	} = p5node.sourceCodeLocation;
	const raw = rawHtml.slice(startOffset, endOffset || startOffset);
	const nextNode = null;
	switch (p5node.nodeName) {
		case '#documentType': {
			nodes.push({
				raw,
				startOffset,
				endOffset,
				startLine,
				endLine,
				startCol,
				endCol,
				nodeName: 'doctype',
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
					raw,
					startOffset,
					endOffset,
					startLine,
					endLine,
					startCol,
					endCol,
					nodeName: 'text',
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
						const node: MLASTNode = {
							raw,
							startOffset,
							endOffset,
							startLine,
							endLine,
							startCol,
							endCol,
							nodeName: 'text',
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
					} else {
						const node: MLASTNode = {
							raw,
							startOffset,
							endOffset,
							startLine,
							endLine,
							startCol,
							endCol,
							nodeName: 'invalidNode',
							type: MLASTNodeType.InvalidNode,
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
			}
			break;
		}
		case '#comment': {
			nodes.push({
				raw,
				startOffset,
				endOffset,
				startLine,
				endLine,
				startCol,
				endCol,
				nodeName: 'comment',
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
				const endTagRaw = rawHtml.slice(
					endTagLoc.startOffset,
					endTagLoc.endOffset,
				);
				const endTagTokens = parseRawTag(
					endTagRaw,
					endTagLoc.startLine,
					endTagLoc.startCol,
					endTagLoc.startOffset,
				);
				const endTagName = endTagTokens.tagName;
				endTag = {
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
				raw: startTagRaw,
				startOffset: endTagLoc.startOffset,
				endOffset: endTagLoc.endOffset,
				startLine: endTagLoc.startLine,
				endLine: endTagLoc.endLine,
				startCol: endTagLoc.startCol,
				endCol: endTagLoc.endCol,
				nodeName: tagName,
				type: MLASTNodeType.StartTag,
				namespace: p5node.namespaceURI,
				attributes: tagTokens.attrs,
				parentNode,
				prevNode,
				nextNode,
				pearNode: endTag,
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
	parentNode: MLASTNode | null = null,
	rawHtml: string,
): MLASTNode[] {
	const nodeList: MLASTNode[] = [];

	const childNodes: P5Node[] = rootNode.content
		? rootNode.content.childNodes
		: rootNode.childNodes;

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

interface TraversalNode {
	childNodes?: P5Node[];
	content?: P5Fragment;
}

type P5Node = parse5.DefaultTreeElement & TraversalNode;
type P5Document = parse5.DefaultTreeDocument & TraversalNode;
type P5Fragment = parse5.DefaultTreeDocumentFragment & TraversalNode;
type P5DocumentType = parse5.DefaultTreeDocumentType;
