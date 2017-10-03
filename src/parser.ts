import * as parse5 from 'parse5';

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
	attributes: {[attrName: string]: string};
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
}

export type Walker = (node: Node) => void;

export abstract class Node {
	public readonly nodeName: string;
	public readonly line: number;
	public readonly col: number;
	public readonly startOffset: number;
	public prevNode: Node | null = null;
	public nextNode: Node | null = null;
	public readonly parentNode: Node | null = null;

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
}

export class Element extends Node {
	public readonly attributes: {[attrName: string]: string};
	public readonly childNodes: Node[];
	public readonly endOffset: number | null;
	public readonly startTagLocation: TagNodeLocation | null;
	public readonly endTagLocation: TagNodeLocation | null;
	public endTagNode: EndTagNode | null;
	public raw = '';

	constructor (props: ElementProperties) {
		super(props);
		this.attributes = props.attributes;
		this.childNodes = props.childNodes;
		this.endOffset = props.location.endOffset || null;
		this.startTagLocation = props.location.startTag || null;
		this.endTagLocation = props.location.endTag || null;
	}
}

export class TextNode extends Node {
	public readonly textContent: string;

	constructor (props: TextNodeProperties) {
		super(props);
		this.textContent = props.textContent;
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
	constructor (props: EndTagNodeProperties) {
		super(props);
		this.startTagNode = props.startTagNode;
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

		interface Pos { pos: number; node: Node; }
		const pos: Pos[] = [];
		walk(nodes, (node) => {
			const i = this._list.length;
			if (node instanceof InvalidNode) {
				return;
			}
			pos.push({ pos: node.startOffset, node });

			if (node instanceof Element) {
				if (node.startTagLocation) {
					const raw = rawHtml.slice(node.startTagLocation.startOffset, node.startTagLocation.endOffset);
					node.raw = raw;

					if (node.endTagLocation) {
						const endTag = new EndTagNode({
							nodeName: `/${node.nodeName}`,
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
						});
						pos.push({ pos: endTag.startOffset, node: endTag });
					}
				} else {
					// Self closing tag
					const raw = rawHtml.slice(node.startOffset, node.endOffset || node.startOffset);
					node.raw = raw;
				}
			}
		});

		pos.sort((a, b) => a.pos - b.pos);

		this._list = pos.map(p => p.node);

		// optimaize TextNode between InvalidNode and Element
		// let lastNode: Node | null = null;
		// let firstNode: Node | null = null;
		// let firstNodeIndex = NaN;
		// for (let i = 0, l = this._list.length; i < l; i++) {
		// 	const n = this._list[i];
		// 	if (!(n instanceof InvalidNode)) {
		// 		firstNode = n;
		// 		firstNodeIndex = i;
		// 		break;
		// 	}
		// 	lastNode = n;
		// }

		// if (firstNode) {
		// 	if (lastNode instanceof InvalidNode) {
		// 		const firstTextContent = rawHtml.slice(0, firstNode.startOffset);
		// 		const firstTextNode = new TextNode({
		// 			nodeName: '#text',
		// 			location: {
		// 				line: 0,
		// 				col: 0,
		// 				startOffset: 0,
		// 				endOffeset: null,
		// 			},
		// 			prevNode: null,
		// 			nextNode: firstNode,
		// 			parentNode: null,
		// 			textContent: firstTextContent,
		// 		});
		// 		firstNode.prevNode = firstTextNode;
		// 		if (firstNode.parentNode instanceof InvalidNode) {
		// 			firstNode.parentNode.childNodes.unshift(firstTextNode);
		// 		}
		// 		if (!isNaN(firstNodeIndex)) {
		// 			this._list.splice(firstNodeIndex, 0, firstTextNode);
		// 		}
		// 	}
		// }
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
				attributes: p5node.attrs ? p5node.attrs[0] || {} : {},
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
	const doc = parse5.parse(html, {locationInfo: true}) as P5ParentNode;
	const nodeList: Node[] = traverse(doc);
	return new Document(nodeList, html);
}

type P5Document = parse5.AST.HtmlParser2.Document & parse5.AST.Document;
interface P5Node extends parse5.AST.HtmlParser2.Node, parse5.AST.Default.Node {}
interface P5ParentNode extends P5Node, parse5.AST.HtmlParser2.ParentNode {
	tagName: string;
	value: string;
	attrs: [{[attrName: string]: string}];
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
	} | null;
}

interface P5DocumentType extends P5ParentNode {
	publicId: string | null;
	systemId: string | null;
}
