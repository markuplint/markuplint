import * as parse5 from 'parse5';

import {
	parseRawTag,
	RawAttribute,
} from './parseRawTag';

export interface Location {
	line: number | null;
	col: number | null;
	startOffset: number | null;
	endOffset: number | null;
}

export interface ExistentLocation {
	line: number;
	col: number;
	startOffset: number;
	endOffset: number | null;
}

export interface TagNodeLocation extends ExistentLocation {
	endOffset: number | null;
}

export interface ElementLocation extends TagNodeLocation {
	startTag: TagNodeLocation;
	endTag: TagNodeLocation | null;
}

export interface NodeProperties {
	nodeName: string;
	location: ExistentLocation;
	prevNode: Node | GhostNode | null;
	nextNode: Node | GhostNode | null;
	parentNode: Node | GhostNode | null;
}

export interface GhostNodeProperties {
	nodeName: string;
	prevNode: Node | GhostNode | null;
	nextNode: Node | GhostNode | null;
	parentNode: Node | GhostNode | null;
	childNodes?: (Node | GhostNode)[];
}

export interface ElementProperties extends NodeProperties {
	namespaceURI: string;
	attributes: Attribute[];
	location: ElementLocation;
	raw: string;
}

export interface OmittedElementProperties extends GhostNodeProperties {
	namespaceURI: string;
}

export interface TextNodeProperties extends NodeProperties {
	textContent: string;
	location: ExistentLocation;
	raw: string;
}

export interface CommentNodeProperties extends NodeProperties {
	data: string;
	location: ExistentLocation;
	raw: string;
}

export interface DocTypeProperties extends NodeProperties {
	publicId: string | null;
	systemId: string | null;
	raw: string;
}

export interface EndTagNodeProperties extends NodeProperties {
	startTagNode: Node | GhostNode;
	raw: string;
}

export interface Attribute {
	name: string;
	value: string | null;
	location: ExistentLocation;
	quote: '"' | "'" | null;
	equal: string | null;
	raw: string;
	invalid: boolean;
}

export type Walker<N = (Node | GhostNode)> = (node: N) => Promise<void>;
export type SyncWalker = (node: Node | GhostNode) => void;

export type NodeType = 'Element' | 'OmittedElement' | 'Text' | 'RawText' | 'Comment' | 'EndTag' | 'Doctype' | 'Invalid' | null;

export abstract class Node {
	public readonly type: NodeType = null;
	public nodeName: string;
	public readonly line: number;
	public readonly col: number;
	public readonly startOffset: number;
	public prevNode: Node | GhostNode | null = null;
	public nextNode: Node | GhostNode | null = null;
	public readonly parentNode: Node | GhostNode | null = null;
	public raw = '';

	constructor (props: NodeProperties) {
		this.nodeName = props.nodeName;
		if (props.location) {
			this.line = props.location.line;
			this.col = props.location.col;
			this.startOffset = props.location.startOffset;
		}
		this.prevNode = props.prevNode;
		this.nextNode = props.nextNode;
		this.parentNode = props.parentNode;
	}

	public toString () {
		return this.raw;
	}

	public toJSON () {
		return {
			nodeName: this.nodeName,
			line: this.line || null,
			col: this.col || null,
		};
	}

	public is (type: NodeType) {
		return this.type === type;
	}
}

export abstract class GhostNode {
	public readonly type: NodeType = null;
	public nodeName: string;
	public prevNode: Node | GhostNode | null = null;
	public nextNode: Node | GhostNode | null = null;
	public readonly parentNode: Node | GhostNode | null = null;
	public raw = '';

	constructor (props: GhostNodeProperties) {
		this.nodeName = props.nodeName;
		this.prevNode = props.prevNode;
		this.nextNode = props.nextNode;
		this.parentNode = props.parentNode;
	}

	public toString () {
		return this.raw;
	}

	public toJSON () {
		return {
			nodeName: this.nodeName,
			isGhost: true,
		};
	}
}

export class Element extends Node {
	public readonly type: NodeType = 'Element';
	public readonly namespaceURI: string;
	public readonly attributes: Attribute[];
	public childNodes: (Node | GhostNode)[] = [];
	public readonly line: number;
	public readonly col: number;
	public readonly startOffset: number;
	public readonly endOffset: number | null = null;
	public readonly startTagLocation: TagNodeLocation | null = null;
	public readonly endTagLocation: TagNodeLocation | null = null;
	public endTagNode: EndTagNode | null;

	constructor (props: ElementProperties) {
		super(props);
		this.namespaceURI = props.namespaceURI;
		this.attributes = props.attributes;
		if (props.location) {
			this.endOffset = props.location.endOffset || null;
			this.startTagLocation = props.location.startTag || null;
			this.endTagLocation = props.location.endTag || null;
		}
		this.raw = props.raw;
	}

	public getAttribute (attrName: string) {
		for (const attr of this.attributes) {
			if (attr.name.toLowerCase() === attrName.toLowerCase()) {
				return attr;
			}
		}
	}

	public get id () {
		return this.getAttribute('id');
	}

	public toJSON () {
		return {
			nodeName: this.nodeName,
			line: this.line || null,
			col: this.col || null,
			childNodes: this.childNodes,
		};
	}
}

export class OmittedElement extends GhostNode {
	public readonly type: NodeType = 'OmittedElement';
	public readonly attributes: never[] = [];
	public childNodes: (Node | GhostNode)[] = [];

	constructor (props: OmittedElementProperties) {
		super(props);
	}
}

export class TextNode extends Node {
	public readonly type: NodeType = 'Text';
	public readonly textContent: string;
	public readonly line: number;
	public readonly col: number;
	public readonly startOffset: number;

	constructor (props: TextNodeProperties) {
		super(props);
		this.textContent = props.textContent;
		this.raw = props.raw;
	}
}

export class RawTextNode extends TextNode {
	public readonly type: NodeType = 'RawText';
	public readonly textContent: string;
	public readonly line: number;
	public readonly col: number;
	public readonly startOffset: number;

	constructor (props: TextNodeProperties) {
		super(props);
		this.textContent = props.textContent;
		this.raw = props.raw;
	}
}

export class CommentNode extends Node {
	public readonly type: NodeType = 'Comment';
	public readonly data: string;
	public readonly line: number;
	public readonly col: number;
	public readonly startOffset: number;

	constructor (props: CommentNodeProperties) {
		super(props);
		this.data = props.data;
		this.raw = props.raw;
	}
}

export class Doctype extends Node {
	public readonly type: NodeType = 'Doctype';
	public readonly publicId: string | null;
	public readonly dtd: string | null;
	public readonly line: number;
	public readonly col: number;
	public readonly startOffset: number;

	constructor (props: DocTypeProperties) {
		super(props);
		this.publicId = props.publicId;
		this.dtd = props.systemId;
		this.raw = props.raw;
	}
}

export class EndTagNode extends Node {
	public readonly type: NodeType = 'EndTag';
	public readonly startTagNode: Node | GhostNode;
	public readonly line: number;
	public readonly col: number;
	public readonly startOffset: number;
	public endOffset: number | null;

	constructor (props: EndTagNodeProperties) {
		super(props);
		this.startTagNode = props.startTagNode;
		this.raw = props.raw;
		if (props.location) {
			this.endOffset = props.location.endOffset;
		}
	}
}

export class InvalidNode extends GhostNode {
	public readonly type: NodeType = 'Invalid';
	public readonly childNodes: (Node | GhostNode)[];

	constructor (props: GhostNodeProperties) {
		super(props);
		this.childNodes = props.childNodes || [];
	}

	public toJSON () {
		return {
			nodeName: this.nodeName,
			childNodes: this.childNodes,
			isGhost: true,
		};
	}
}

export class Document {
	private _raw: string;
	private _tree: (Node | GhostNode)[] = [];
	private _list: (Node | GhostNode)[] = [];

	constructor (nodeTree: (Node | GhostNode)[], rawHtml: string) {
		this._raw = rawHtml;
		this._tree = nodeTree;

		const pos: { offset: number; node: Node | GhostNode }[] = [];

		let currentOffset = 0;
		syncWalk(nodeTree, (node) => {
			const i = pos.length;

			if (node instanceof Node) {
				currentOffset = node.startOffset != null ? node.startOffset : currentOffset;
			}

			pos.push({ offset: currentOffset, node });
		});

		{
			const lastNode = pos.pop();
			if (lastNode) {
				const matched = lastNode.node.raw.match(/^([^<]+)(<\/body\s*>)+(\s*)(<\/html\s*>)+(\s*)$/i);
				if (!matched) {
					pos.push(lastNode);
				} else {
					const before = matched[1] || null;
					const body = matched[2] || null;
					const sep = matched[3] || null;
					const html = matched[4] || null;
					const after = matched[5] || null;

					if (before) {
						pos.push({
							offset: lastNode.offset,
							node: new TextNode({
								nodeName: '#text',
								location: {
									line: lastNode.node.line,
									col: lastNode.node.col,
									startOffset: lastNode.node.startOffset,
									endOffset: (lastNode.node.startOffset || 0) + before.length,
								},
								prevNode: lastNode.node.prevNode,
								nextNode: null,
								parentNode: lastNode.node.parentNode,
								textContent: before,
								raw: before,
							}),
						});
					}

					// TODO: sep
					// if (sep) {
					// 	pos.push({
					// 		pos: lastNode.node.startOffset,
					// 		node: new TextNode({
					// 			nodeName: '#text',
					// 			location: {
					// 				line: lastNode.node.line,
					// 				col: lastNode.node.col,
					// 				startOffset: lastNode.node.startOffset,
					// 				endOffset: lastNode.node.startOffset + before.length,
					// 			},
					// 			prevNode: lastNode.node.prevNode,
					// 			nextNode: null,
					// 			parentNode: lastNode.node.parentNode,
					// 			textContent: before,
					// 			raw: before,
					// 		}),
					// 	});
					// }

					// TODO: after
					// if (after) {
					// 	pos.push({
					// 		pos: lastNode.node.startOffset,
					// 		node: new TextNode({
					// 			nodeName: '#text',
					// 			location: {
					// 				line: lastNode.node.line,
					// 				col: lastNode.node.col,
					// 				startOffset: lastNode.node.startOffset,
					// 				endOffset: lastNode.node.startOffset + before.length,
					// 			},
					// 			prevNode: lastNode.node.prevNode,
					// 			nextNode: null,
					// 			parentNode: lastNode.node.parentNode,
					// 			textContent: before,
					// 			raw: before,
					// 		}),
					// 	});
					// }
				}
			}
		}

		pos.forEach(({node, offset}, i) => {
			if (i === 0 && offset > 0) {
				const firstTextContent = rawHtml.slice(0, offset);
				const firstTextNode = new TextNode({
					nodeName: '#text',
					location: {
						line: 0,
						col: 0,
						startOffset: 0,
						endOffset: null,
					},
					prevNode: null,
					nextNode: node,
					parentNode: null,
					textContent: firstTextContent,
					raw: firstTextContent,
				});
				pos.push({ offset: 0, node: firstTextNode });
			}

			if (node instanceof Element) {
				if (node.startTagLocation) {
					if (node.endTagLocation && node.endTagLocation.startOffset != null && node.endTagLocation.endOffset != null) {
						const endTagRaw = rawHtml.slice(node.endTagLocation.startOffset, node.endTagLocation.endOffset);
						const endTagName = endTagRaw.replace(/^<\/((?:[a-z]+:)?[a-z]+(?:-[a-z]+)*)\s*>/i, '$1');
						const endTag = new EndTagNode({
							nodeName: endTagName,
							location: {
								line: node.endTagLocation.line,
								col: node.endTagLocation.col,
								startOffset: node.endTagLocation.startOffset,
								endOffset: node.endTagLocation.endOffset,
							},
							prevNode: null,
							nextNode: null,
							parentNode: node.parentNode,
							startTagNode: node,
							raw: endTagRaw,
						});
						pos.push({ offset: node.endTagLocation.startOffset, node: endTag });
					}
				}
			}
		});

		pos.sort((a, b) => a.offset - b.offset);

		this._list = pos.map(p => p.node);
	}

	public get root () {
		return {
			childNodes: this._tree,
		};
	}

	public get raw () {
		return this._raw;
	}

	public get list () {
		return this._list;
	}

	public toString () {
		const s: string[] = [];
		this.syncWalk((node) => {
			s.push(node.raw);
		});
		return s.join('');
	}

	public toJSON () {
		return JSON.parse(JSON.stringify(this._tree));
	}

	public async walk (walker: Walker) {
		for (const node of this._list) {
			await walker(node);
		}
	}

	public async walkOn (type: 'Element', walker: Walker<Element>): Promise<void>;
	public async walkOn (type: 'Text', walker: Walker<TextNode>): Promise<void>;
	public async walkOn (type: 'Comment', walker: Walker<CommentNode>): Promise<void>;
	public async walkOn (type: 'EndTag', walker: Walker<EndTagNode>): Promise<void>;
	public async walkOn (type: NodeType, walker: Walker<any>): Promise<void> { // tslint:disable-line:no-any
		for (const node of this._list) {
			if (node instanceof Node && node.is(type)) {
				await walker(node);
			}
		}
	}

	public syncWalk (walker: SyncWalker) {
		for (const node of this._list) {
			walker(node);
		}
	}

	public getNode (index: number): Node | GhostNode | null {
		return this._tree[index];
	}
}

async function walk (nodeList: (Node | GhostNode)[], walker: Walker) {
	for (const node of nodeList) {
		await walker(node);
		if (node instanceof Element || node instanceof InvalidNode || node instanceof OmittedElement) {
			await walk(node.childNodes, walker);
		}
	}
}

function syncWalk (nodeList: (Node | GhostNode)[], walker: SyncWalker) {
	for (const node of nodeList) {
		walker(node);
		if (node instanceof Element || node instanceof InvalidNode || node instanceof OmittedElement) {
			syncWalk(node.childNodes, walker);
		}
	}
}

function setLocation (location: P5ParentNode['__location'] | null) {
	if (location == null) {
		return null;
	}
	return {
		line: location.line,
		col: location.col,
		startOffset: location.startOffset,
		endOffset: location.endOffset,
	};
}

// tslint:disable-next-line:cyclomatic-complexity
function nodeize (p5node: P5ParentNode, prev: Node | GhostNode | null, parent: Node | GhostNode | null, rawHtml: string): Node | GhostNode {
	let node: Node | GhostNode;
	switch (p5node.nodeName) {
		case '#documentType': {
			if (!p5node.__location) {
				return new InvalidNode({
					nodeName: '#invalid',
					childNodes: traverse(p5node, parent, rawHtml),
					prevNode: prev,
					nextNode: null,
					parentNode: parent,
				});
			}
			const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
			node = new Doctype({
				nodeName: '#doctype',
				location: setLocation(p5node.__location)!,
				prevNode: prev,
				nextNode: null,
				parentNode: parent,
				publicId: (p5node as P5DocumentType).publicId || null,
				systemId: (p5node as P5DocumentType).systemId || null,
				raw,
			});
			break;
		}
		case '#text': {
			if (!p5node.__location) {
				return new InvalidNode({
					nodeName: '#invalid',
					childNodes: traverse(p5node, parent, rawHtml),
					prevNode: prev,
					nextNode: null,
					parentNode: parent,
				});
			}
			const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
			if (parent && /^(?:script|style)$/i.test(parent.nodeName)) {
				node = new RawTextNode({
					nodeName: p5node.nodeName,
					location: setLocation(p5node.__location)!,
					prevNode: prev,
					nextNode: null,
					parentNode: parent,
					textContent: p5node.value,
					raw,
				});
			} else {
				node = new TextNode({
					nodeName: p5node.nodeName,
					location: setLocation(p5node.__location)!,
					prevNode: prev,
					nextNode: null,
					parentNode: parent,
					textContent: p5node.value,
					raw,
				});
			}
			break;
		}
		case '#comment': {
			if (!p5node.__location) {
				return new InvalidNode({
					nodeName: '#invalid',
					childNodes: traverse(p5node, parent, rawHtml),
					prevNode: prev,
					nextNode: null,
					parentNode: parent,
				});
			}
			const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
			// @ts-ignore
			node = new CommentNode({
				nodeName: p5node.nodeName,
				location: setLocation(p5node.__location)!,
				prevNode: prev,
				nextNode: null,
				parentNode: parent,
				// @ts-ignore
				data: p5node.data,
				raw,
			});
			break;
		}
		default: {
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
							endOffset: null,
						},
						quote: attr.quote,
						equal: attr.equal,
						invalid: attr.invalid,
						raw: attr.raw,
					});
				}
				node = new Element({
					nodeName,
					namespaceURI: p5node.namespaceURI,
					attributes,
					location: {
						line: p5node.__location.line,
						col: p5node.__location.col,
						startOffset: p5node.__location.startOffset,
						endOffset: p5node.__location.endOffset,
						startTag: p5node.__location.startTag!,
						endTag: p5node.__location.endTag || null,
					},
					prevNode: prev,
					nextNode: null,
					parentNode: parent,
					raw,
				});
			} else {
				node = new OmittedElement({
					nodeName: p5node.nodeName,
					namespaceURI: p5node.namespaceURI,
					prevNode: prev,
					nextNode: null,
					parentNode: parent,
				});
			}
			(node as (Element | OmittedElement)).childNodes =  traverse(p5node, node, rawHtml);
		}
	}
	return node;
}

function traverse (rootNode: P5ParentNode, parentNode: Node | GhostNode | null = null, rawHtml: string): (Node | GhostNode)[] {
	const nodeList: (Node | GhostNode)[] = [];
	let prev: Node | GhostNode | null = null;
	for (const p5node of rootNode.childNodes) {
		const node = nodeize(p5node, prev, parentNode, rawHtml);
		if (prev) {
			prev.nextNode = node;
		}
		prev = node;
		nodeList.push(node);
	}
	return nodeList;
}

export default function parser (html: string) {
	const doc = parse5.parse(
		html,
		{
			locationInfo: true,
		},
	) as P5ParentNode;

	const nodeTree: (Node | GhostNode)[] = traverse(doc, null, html);
	return new Document(nodeTree, html);
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
