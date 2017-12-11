import * as parse5 from 'parse5';

import {
	parseRawTag,
	RawAttribute,
} from './parseRawTag';

export interface NodeLocation {
	line: number;
	col: number;
	startOffset: number;
	endOffset: number | null;
}

export interface TagNodeLocation extends NodeLocation {
	endOffset: number;
}

export interface ElementLocation extends NodeLocation {
	startTag: TagNodeLocation | null;
	endTag: TagNodeLocation | null;
}

export interface NodeProperties {
	nodeName: string;
	location: NodeLocation | null;
	prevNode: Node | null;
	nextNode: Node | null;
	parentNode: Node | null;
}

export interface ElementProperties extends NodeProperties {
	namespaceURI: string;
	attributes: Attribute[];
	childNodes: Node[];
	location: ElementLocation;
}

export interface TextNodeProperties extends NodeProperties {
	textContent: string;
	location: NodeLocation;
}

export interface DocTypeProperties extends NodeProperties {
	publicId: string | null;
	systemId: string | null;
}

export interface InvalidNodeProperties extends NodeProperties {
	childNodes: Node[];
	location: null;
}

export interface EndTagNodeProperties extends NodeProperties {
	startTagNode: Node;
	raw: string;
}

export interface Attribute extends NodeLocation {
	name: string;
	value: string;
	endOffset: number;
	rawAttr: RawAttribute[];
}

export type Walker = (node: Node) => void;

export abstract class Node {
	public nodeName: string;
	public readonly line: number;
	public readonly col: number;
	public readonly startOffset: number;
	public prevNode: Node | null = null;
	public nextNode: Node | null = null;
	public readonly parentNode: Node | null = null;
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
}

export class Element extends Node {
	public readonly namespaceURI: string;
	public readonly attributes: Attribute[];
	public readonly childNodes: Node[];
	public readonly endOffset: number | null;
	public readonly startTagLocation: TagNodeLocation | null;
	public readonly endTagLocation: TagNodeLocation | null;
	public endTagNode: EndTagNode | null;

	constructor (props: ElementProperties) {
		super(props);
		this.namespaceURI = props.namespaceURI;
		this.attributes = props.attributes;
		this.childNodes = props.childNodes;
		this.endOffset = props.location.endOffset || null;
		this.startTagLocation = props.location.startTag || null;
		this.endTagLocation = props.location.endTag || null;
	}

	public getAttribute (attrName: string) {
		for (const attr of this.attributes) {
			for (const rawAttr of attr.rawAttr) {
				if (rawAttr.name.toLowerCase() === attrName.toLowerCase()) {
					return rawAttr;
				}
			}
		}
	}

	public get id () {
		return this.getAttribute('id');
	}
}

export class TextNode extends Node {
	public readonly textContent: string;

	constructor (props: TextNodeProperties) {
		super(props);
		this.textContent = props.textContent;
		this.raw = props.textContent;
	}
}

export class Doctype extends Node {
	public readonly publicId: string | null;
	public readonly dtd: string | null;

	constructor (props: DocTypeProperties) {
		super(props);
		this.publicId = props.publicId;
		this.dtd = props.systemId;
	}
}

export class EndTagNode extends Node {
	public readonly startTagNode: Node;
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

export class InvalidNode extends Node {
	public readonly childNodes: Node[];

	constructor (props: InvalidNodeProperties) {
		super(props);
		this.childNodes = props.childNodes;
	}
}

export class Document {
	private _raw: string;
	private _tree: Node[] = [];
	private _list: Node[] = [];

	constructor (nodes: Node[], rawHtml: string) {
		this._raw = rawHtml;
		this._tree = nodes;

		const pos: { pos: number; node: Node }[] = [];
		walk(nodes, (node) => {
			const i = pos.length;

			if (node instanceof InvalidNode) {
				return;
			}

			if (i === 0 && node.startOffset > 0) {
				const firstTextContent = rawHtml.slice(0, node.startOffset);
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
				});
				pos.push({ pos: 0, node: firstTextNode });
			}

			pos.push({ pos: node.startOffset, node });

			if (node instanceof Element) {
				if (node.startTagLocation) {
					const raw = rawHtml.slice(node.startTagLocation.startOffset, node.startTagLocation.endOffset);
					node.raw = raw;

					if (node.endTagLocation) {
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
						pos.push({ pos: endTag.startOffset, node: endTag });
					}
				} else {
					// Self closing tag
					const raw = rawHtml.slice(node.startOffset, node.endOffset || node.startOffset);
					node.raw = raw;
				}

				// Get raw tag name and attributes
				//
				// NOTE:
				// "parse5" parser will normalize the case of the tag and attribute name.
				// And duplicated attribute will leave one.
				//
				if (node.raw) {
					const rawTag = parseRawTag(node.raw, node.line, node.col);
					node.nodeName = rawTag.tagName;
					for (const attr of node.attributes) {
						for (const rawAttr of rawTag.attrs) {
							if (attr.name === rawAttr.name.toLowerCase()) {
								attr.rawAttr.push(rawAttr);
							}
						}
					}
				}
			}
		});

		pos.sort((a, b) => a.pos - b.pos);

		this._list = pos.map(p => p.node);
	}

	public get root () {
		return {
			childNodes: this._tree,
		};
	}

	public walk (walker: Walker) {
		for (const node of this._list) {
			walker(node);
		}
	}

	public getNode (index: number): Node | null {
		return this._tree[index];
	}
}

function walk (nodeList: Node[], walker: (node: Node) => void) {
	for (const node of nodeList) {
		walker(node);
		if (node instanceof Element || node instanceof InvalidNode) {
			walk(node.childNodes, walker);
		}
	}
}

function nodeize (p5node: P5ParentNode, prev: Node | null, parent: Node | null): Node {
	if (!p5node.__location) {
		return new InvalidNode({
			nodeName: '#invalid',
			location: null,
			childNodes: traverse(p5node, parent),
			prevNode: prev,
			nextNode: null,
			parentNode: parent,
		});
	}
	let node: Node;
	switch (p5node.nodeName) {
		case '#documentType': {
			node = new Doctype({
				nodeName: '#doctype',
				location: {
					line: p5node.__location.line,
					col: p5node.__location.col,
					startOffset: p5node.__location.startOffset,
					endOffset: p5node.__location.endOffset,
				},
				prevNode: prev,
				nextNode: null,
				parentNode: parent,
				publicId: (p5node as P5DocumentType).publicId || null,
				systemId: (p5node as P5DocumentType).systemId || null,
			});
			break;
		}
		case '#text': {
			node = new TextNode({
				nodeName: p5node.nodeName,
				location: {
					line: p5node.__location.line,
					col: p5node.__location.col,
					startOffset: p5node.__location.startOffset,
					endOffset: p5node.__location.endOffset,
				},
				prevNode: prev,
				nextNode: null,
				parentNode: parent,
				textContent: p5node.value,
			});
			break;
		}
		default: {
			node = new Element({
				nodeName: p5node.tagName,
				namespaceURI: p5node.namespaceURI,
				attributes: p5node.attrs ? p5node.attrs.map((attr) => {
					if (!p5node.__location || !p5node.__location.attrs) {
						throw new Error();
					}
					const location = p5node.__location.attrs[attr.name.toLowerCase()];
					if (!location) {
						throw new Error();
					}
					return {
						name: attr.name,
						value: attr.value,
						col: location.col,
						line: location.line,
						startOffset: location.startOffset,
						endOffset: location.endOffset,
						rawAttr: [],
					};
				}) : [],
				location: {
					line: p5node.__location.line,
					col: p5node.__location.col,
					startOffset: p5node.__location.startOffset,
					endOffset: p5node.__location.endOffset,
					startTag: p5node.__location.startTag || null,
					endTag: p5node.__location.endTag || null,
				},
				prevNode: prev,
				nextNode: null,
				parentNode: parent,
				childNodes: traverse(p5node, parent),
			});
		}
	}
	return node;
}

function traverse (rootNode: P5ParentNode, parentNode: Node | null = null): Node[] {
	const nodeList: Node[] = [];
	let prev: Node | null = null;
	for (const p5node of rootNode.childNodes) {
		const node = nodeize(p5node, prev, parentNode);
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

	const nodeList: Node[] = traverse(doc);
	return new Document(nodeList, html);
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
