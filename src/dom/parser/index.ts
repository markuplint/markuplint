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
	Attribute,
	ElementLocation,
	ExistentLocation,
	NodeType,
} from '../';

import Document from '../document';

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
	const doc = parse5.parse(
		html,
		{
			locationInfo: true,
		},
	) as P5ParentNode;

	const nodeTree: (Node | GhostNode)[] = traverse(doc, null, html);
	return new Document(nodeTree, html, ruleset);
}

// tslint:disable-next-line:cyclomatic-complexity
function nodeize<T, O> (p5node: P5ParentNode, prev: Node<T, O> | GhostNode<T, O> | null, parent: Node<T, O> | GhostNode<T, O> | null, rawHtml: string): (Node<T, O> | GhostNode<T, O>)[] {
	const nodes: (Node<T, O> | GhostNode<T, O>)[] = [];
	switch (p5node.nodeName) {
		case '#documentType': {
			if (!p5node.__location) {
				throw new Error('Invalid Syntax');
			}
			const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
			const node = new Doctype(
				'#doctype',
				raw,
				p5node.__location.line,
				p5node.__location.col,
				p5node.__location.startOffset,
				prev,
				null,
				parent,
				(p5node as P5DocumentType).publicId || null,
				(p5node as P5DocumentType).systemId || null,
			);
			nodes.push(node);
			break;
		}
		case '#text': {
			if (!p5node.__location) {
				throw new Error('Invalid Syntax');
			}
			const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
			if (parent && /^(?:script|style)$/i.test(parent.nodeName)) {
				const node = new RawText<T, O>(
					p5node.nodeName,
					raw,
					p5node.__location.line,
					p5node.__location.col,
					p5node.__location.startOffset,
					prev,
					null,
					parent,
				);
				nodes.push(node);
			} else {
				const tokens = tagSplitter(raw, p5node.__location.line, p5node.__location.col);
				let startOffset = p5node.__location.startOffset;

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
			if (!p5node.__location) {
				throw new Error('Invalid Syntax');
			}
			const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
			const node = new CommentNode<T, O>(
				p5node.nodeName,
				raw,
				p5node.__location.line,
				p5node.__location.col,
				p5node.__location.startOffset,
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
			if (p5node.__location) {
				const raw =
					p5node.__location.startTag
					?
					rawHtml.slice(p5node.__location.startTag.startOffset, p5node.__location.startTag.endOffset)
					:
					rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
				const rawTag = parseRawTag(raw, p5node.__location.line, p5node.__location.col);
				const nodeName = rawTag.tagName;
				const attributes: Attribute[] = [];
				for (const attr of rawTag.attrs) {
					attributes.push({
						name: attr.name,
						value: attr.value,
						location: {
							line: attr.line,
							col: attr.col,
							startOffset: -1,
							endOffset: attr.raw.length - 1,
						},
						quote: attr.quote,
						equal: attr.equal,
						invalid: attr.invalid,
						raw: attr.raw,
					});
				}
				let endTag: EndTagNode<T, O> | null = null;
				const endTagLocation = p5node.__location.endTag;
				if (endTagLocation) {
					const endTagRaw = rawHtml.slice(endTagLocation.startOffset, endTagLocation.endOffset);
					const endTagName = endTagRaw.replace(/^<\/((?:[a-z]+:)?[a-z]+(?:-[a-z]+)*)\s*>/i, '$1');
					endTag = new EndTagNode<T, O>(
						endTagName,
						endTagRaw,
						endTagLocation.line,
						endTagLocation.col,
						endTagLocation.startOffset,
						null,
						null,
						parent,
					);
				}

				node = new Element<T, O>(
					nodeName,
					raw,
					p5node.__location.line,
					p5node.__location.col,
					p5node.__location.startOffset,
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

function traverse<T, O> (rootNode: P5ParentNode, parentNode: Node<T, O> | GhostNode<T, O> | null = null, rawHtml: string): (Node<T, O> | GhostNode<T, O>)[] {
	const nodeList: (Node<T, O> | GhostNode<T, O>)[] = [];
	let prev: Node<T, O> | GhostNode<T, O> | null = null;
	for (const p5node of rootNode.childNodes) {
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

type P5Document = parse5.AST.HtmlParser2.Document & parse5.AST.Document;
interface P5Node extends parse5.AST.HtmlParser2.Node, parse5.AST.Default.Node {}
interface P5ParentNode extends P5Node, parse5.AST.HtmlParser2.ParentNode {
	tagName: string;
	value: string;
	attrs: {
		name: string;
		value: string;
	}[];
	namespaceURI: string;
	childNodes: P5ParentNode[];
	__location: {
		line: number;
		col: number;
		startOffset: number;
		endOffset: number | null;
		startTag: {
			line: number;
			col: number;
			startOffset: number;
			endOffset: number;
		} | null;
		endTag: {
			line: number;
			col: number;
			startOffset: number;
			endOffset: number;
		} | null;
		attrs?: {
			[attrName: string]: {
				line: number;
				col: number;
				startOffset: number;
				endOffset: number;
			};
		};
	} | null;
}

interface P5DocumentType extends P5ParentNode {
	publicId: string | null;
	systemId: string | null;
}
