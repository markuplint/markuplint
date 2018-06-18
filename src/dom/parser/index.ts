import parse5 from 'parse5';

import Ruleset from '../../ruleset';

import {
	ConfigureFileJSONRules,
	ConfigureFileJSONRuleOption,
	NodeRule,
} from '../../ruleset/JSONInterface';

import getCol from './get-col';
import getLine from './get-line';
import parseRawTag from './parse-raw-tag';
import tagSplitter from './tag-splitter';

import {
	ElementLocation,
	ExistentLocation,
	NodeType,
	ParentNode,
} from '../';

import Document from '../document';

import Attribute from '../attribute';
import CommentNode from '../comment-node';
import Doctype from '../doctype';
import Element from '../element';
import EndTagNode from '../end-tag-node';
import GhostNode from '../ghost-node';
import InvalidNode from '../invalid-node';
import Node from '../node';
import OmittedElement from '../omitted-element';
import RawText from '../raw-text';
import TextNode from '../text-node';

export default function parser (html: string, ruleset?: Ruleset) {
	const isFragment = isDocumentFragment(html);

	const doc = isFragment ?
		parse5.parseFragment(html, { sourceCodeLocationInfo: true }) as P5Fragment
		:
		parse5.parse(html, { sourceCodeLocationInfo: true }) as P5Document;

	const nodeTree: (Node | GhostNode)[] = traverse(doc, null, html);

	return new Document(nodeTree, html, isFragment, ruleset);
}

export function isDocumentFragment (html: string) {
	return !/^\s*(<!doctype html(?:\s*.+)?>|<html(?:\s|>))/im.test(html);
}

// tslint:disable-next-line:cyclomatic-complexity
function nodeize<T, O> (p5node: P5Node, prev: Node<T, O> | GhostNode<T, O> | null, parent: ParentNode<T, O> | null, rawHtml: string): (Node<T, O> | GhostNode<T, O>)[] {
	const nodes: (Node<T, O> | GhostNode<T, O>)[] = [];
	switch (p5node.nodeName) {
		case '#documentType': {
			if (!p5node.sourceCodeLocation) {
				throw new Error('Invalid Syntax');
			}
			const raw = rawHtml.slice(p5node.sourceCodeLocation.startOffset, p5node.sourceCodeLocation.endOffset || p5node.sourceCodeLocation.startOffset);
			const node = new Doctype(
				'#doctype',
				raw,
				p5node.sourceCodeLocation.startLine,
				p5node.sourceCodeLocation.startCol,
				p5node.sourceCodeLocation.startOffset,
				prev,
				null,

				// @ts-ignore
				(p5node as P5DocumentType).publicId || null,

				// @ts-ignore
				(p5node as P5DocumentType).systemId || null,
			);
			nodes.push(node);
			break;
		}
		case '#text': {
			if (!p5node.sourceCodeLocation) {
				throw new Error('Invalid Syntax');
			}
			const raw = rawHtml.slice(p5node.sourceCodeLocation.startOffset, p5node.sourceCodeLocation.endOffset || p5node.sourceCodeLocation.startOffset);
			if (parent && /^(?:script|noscript|style)$/i.test(parent.nodeName)) {
				const node = new RawText<T, O>(
					p5node.nodeName,
					raw,
					p5node.sourceCodeLocation.startLine,
					p5node.sourceCodeLocation.startCol,
					p5node.sourceCodeLocation.startOffset,
					prev,
					null,
					parent,
				);
				nodes.push(node);
			} else {
				const tokens = tagSplitter(raw, p5node.sourceCodeLocation.startLine, p5node.sourceCodeLocation.startCol);
				let startOffset = p5node.sourceCodeLocation.startOffset;

				for (const token of tokens) {
					const endOffset = startOffset + token.raw.length;
					if (token.type === 'text') {
						const node = new TextNode<T, O>(
							p5node.nodeName,
							token.raw,
							token.line,
							token.col,
							startOffset,
							prev,
							null,
							parent,
						);
						prev = node;
						startOffset = endOffset;
						nodes.push(node);
					} else {
						const node = new InvalidNode<T, O>(
							'#invalid',
							token.raw,
							token.line,
							token.col,
							startOffset,
							prev,
							null,
							parent,
						);
						prev = node;
						startOffset = endOffset;
						nodes.push(node);
					}
				}
			}
			break;
		}
		case '#comment': {
			if (!p5node.sourceCodeLocation) {
				throw new Error('Invalid Syntax');
			}
			const raw = rawHtml.slice(p5node.sourceCodeLocation.startOffset, p5node.sourceCodeLocation.endOffset || p5node.sourceCodeLocation.startOffset);
			const node = new CommentNode<T, O>(
				p5node.nodeName,
				raw,
				p5node.sourceCodeLocation.startLine,
				p5node.sourceCodeLocation.startCol,
				p5node.sourceCodeLocation.startOffset,
				prev,
				null,
				parent,
				// @ts-ignore
				p5node.data,
			);
			nodes.push(node);
			break;
		}
		default: {
			let node: Element<T, O> | OmittedElement<T, O> | null = null;
			if (p5node.sourceCodeLocation) {
				const raw =
					p5node.sourceCodeLocation.startTag
					?
					rawHtml.slice(p5node.sourceCodeLocation.startTag.startOffset, p5node.sourceCodeLocation.startTag.endOffset)
					:
					rawHtml.slice(p5node.sourceCodeLocation.startOffset, p5node.sourceCodeLocation.endOffset || p5node.sourceCodeLocation.startOffset);
				const rawTag = parseRawTag(raw, p5node.sourceCodeLocation.startLine, p5node.sourceCodeLocation.startCol, p5node.sourceCodeLocation.startOffset);

				const nodeName = rawTag.tagName;
				const attributes: Attribute[] = rawTag.attrs;

				let endTag: EndTagNode<T, O> | null = null;
				const endTagLocation = p5node.sourceCodeLocation.endTag;
				if (endTagLocation) {
					const endTagRaw = rawHtml.slice(endTagLocation.startOffset, endTagLocation.endOffset);
					const endTagName = endTagRaw.replace(/^<\/((?:[a-z]+:)?[a-z0-9]+(?:-[a-z0-9]+)*)\s*>/i, '$1');
					endTag = new EndTagNode<T, O>(
						endTagName,
						endTagRaw,
						endTagLocation.startLine,
						endTagLocation.startCol,
						endTagLocation.startOffset,
						null,
						null,
						parent,
					);
				}

				node = new Element<T, O>(
					nodeName,
					raw,
					p5node.sourceCodeLocation.startLine,
					p5node.sourceCodeLocation.startCol,
					p5node.sourceCodeLocation.startOffset,
					prev,
					null,
					parent,
					attributes,
					p5node.namespaceURI,
					endTag,
				);
				if (endTag) {
					// @ts-ignore
					endTag.startTagNode = node;
				}

			} else {
				node = new OmittedElement<T, O>(
					p5node.nodeName,
					prev,
					null,
					parent,
					p5node.namespaceURI,
				);
			}
			if (node) {
				node.childNodes =  traverse(p5node, node, rawHtml);
				nodes.push(node);
			}
		}
	}
	return nodes;
}

function traverse<T, O> (rootNode: P5Node | P5Document | P5Fragment, parentNode: ParentNode<T, O> | null = null, rawHtml: string): (Node<T, O> | GhostNode<T, O>)[] {
	const nodeList: (Node<T, O> | GhostNode<T, O>)[] = [];

	const childNodes: P5Node[] = rootNode.content ?
		rootNode.content.childNodes
		:
		rootNode.childNodes;

	let prev: Node<T, O> | GhostNode<T, O> | null = null;
	for (const p5node of childNodes) {
		const nodes: (Node<T, O> | GhostNode<T, O>)[] = nodeize(p5node, prev, parentNode, rawHtml);
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
