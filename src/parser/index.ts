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
	endOffset: number;
}

export interface TagNodeLocation extends ExistentLocation {
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
	raw: string;
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
}

export interface OmittedElementProperties extends GhostNodeProperties {
	namespaceURI: string;
}

export interface TextNodeProperties extends NodeProperties {
	location: ExistentLocation;
}

export interface CommentNodeProperties extends NodeProperties {
	data: string;
	location: ExistentLocation;
}

export interface DocTypeProperties extends NodeProperties {
	publicId: string | null;
	systemId: string | null;
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

function getLine (html: string, line: number) {
	return html.split(/\r?\n/).length - 1 + line;
}

function getCol (html: string, col: number) {
	const lines = html.split(/\r?\n/);
	const lineCount = lines.length;
	const lastLine = lines.pop()!;
	return lineCount > 1 ? lastLine.length : col + html.length;
}

export abstract class Node {
	public readonly type: NodeType = null;
	public nodeName: string;
	public readonly line: number;
	public readonly col: number;
	public readonly endLine: number;
	public readonly endCol: number;
	public readonly startOffset: number;
	public endOffset: number;
	public prevNode: Node | GhostNode | null = null;
	public nextNode: Node | GhostNode | null = null;
	public readonly parentNode: Node | GhostNode | null = null;
	public raw = '';

	constructor (props: NodeProperties) {
		this.nodeName = props.nodeName;
		this.line = props.location.line;
		this.col = props.location.col;
		this.endLine = getLine(props.raw, this.line);
		this.endCol = getCol(props.raw, this.col);
		this.startOffset = props.location.startOffset;
		this.endOffset = props.location.endOffset;
		this.prevNode = props.prevNode;
		this.nextNode = props.nextNode;
		this.parentNode = props.parentNode;
		this.raw = props.raw;
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
	public readonly startTagLocation: TagNodeLocation;
	public readonly endTagLocation: TagNodeLocation | null = null;
	public endTagNode: EndTagNode | null = null;

	constructor (props: ElementProperties, rawHtml: string) {
		super(props);
		this.namespaceURI = props.namespaceURI;
		this.attributes = props.attributes;
		this.startTagLocation = props.location.startTag;
		this.endTagLocation = props.location.endTag || null;

		if (this.endTagLocation && this.endTagLocation.startOffset != null && this.endTagLocation.endOffset != null) {
			const endTagRaw = rawHtml.slice(this.endTagLocation.startOffset, this.endTagLocation.endOffset);
			const endTagName = endTagRaw.replace(/^<\/((?:[a-z]+:)?[a-z]+(?:-[a-z]+)*)\s*>/i, '$1');
			const endTag = new EndTagNode({
				nodeName: endTagName,
				location: {
					line: this.endTagLocation.line,
					col: this.endTagLocation.col,
					startOffset: this.endTagLocation.startOffset,
					endOffset: this.endTagLocation.endOffset,
				},
				prevNode: null,
				nextNode: null,
				parentNode: this.parentNode,
				startTagNode: this,
				raw: endTagRaw,
			});
			this.endTagNode = endTag;
		}
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

	constructor (props: TextNodeProperties) {
		super(props);
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
	}
}

export class Doctype extends Node {
	public readonly type: NodeType = 'Doctype';
	public readonly publicId: string | null;
	public readonly dtd: string | null;

	constructor (props: DocTypeProperties) {
		super(props);
		this.publicId = props.publicId;
		this.dtd = props.systemId;
	}
}

export class EndTagNode extends Node {
	public readonly type: NodeType = 'EndTag';
	public readonly startTagNode: Node | GhostNode;

	constructor (props: EndTagNodeProperties) {
		super(props);
		this.startTagNode = props.startTagNode;
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

interface SortableNode {
	node: Node | GhostNode;
	startOffset: number;
	endOffset: number;
}

export class Document {
	public readonly html: Node | GhostNode;
	public readonly head: Node | GhostNode;
	public readonly body: Node | GhostNode;

	private _raw: string;
	private _tree: (Node | GhostNode)[] = [];
	private _list: (Node | GhostNode)[] = [];

	constructor (nodeTree: (Node | GhostNode)[], rawHtml: string) {
		this._raw = rawHtml;
		this._tree = nodeTree;

		const pos: SortableNode[] = [];

		let prevLine = 1;
		let prevCol = 1;
		let currentStartOffset = 0;
		let currentEndOffset = 0;
		syncWalk(nodeTree, (node) => {
			if (node instanceof Node) {
				currentStartOffset = node.startOffset;

				const diff = currentStartOffset - currentEndOffset;
				if (diff > 0) {
					const html = rawHtml.slice(currentEndOffset, currentStartOffset);
					// console.log(`diff: ${diff} => "${spaces.replace(/\n/g, '⏎').replace(/\t/g, '→').replace(/\s/g, '␣')}"`);

					if (/^\s+$/.test(html)) {
						const spaces = html;
						const textNode = new TextNode({
							nodeName: '#ws',
							location: {
								line: prevLine,
								col: prevCol,
								startOffset: currentEndOffset,
								endOffset: currentEndOffset + spaces.length,
							},
							prevNode: node.prevNode,
							nextNode: node,
							parentNode: node.parentNode,
							raw: spaces,
						});
						node.prevNode = textNode;

						pos.push({
							node: textNode,
							startOffset: currentEndOffset,
							endOffset: currentEndOffset + spaces.length,
						});
					} else if (/^<\/[a-z0-9][a-z0-9:-]*>$/i) {
						// close tag
					} else {
						throw new Error(`what?!`);
					}

				}

				currentEndOffset = currentStartOffset + node.raw.length;

				prevLine = node.endLine;
				prevCol = node.endCol;
			}

			pos.push({
				node,
				startOffset: currentStartOffset,
				endOffset: currentEndOffset,
			});
		});

		pos.sort((a, b) => a.startOffset - b.startOffset);

		// last child text node of body
		let lastChildTextNode: TextNode | null = null;
		let lastChildTextNodeEndOffset: number | null = null;
		for (const {node, startOffset, endOffset} of pos) {
			if (node.nodeName === 'body' && node instanceof Element || node instanceof OmittedElement) {
				const child = node.childNodes[node.childNodes.length - 1];
				if (child instanceof TextNode) {
					lastChildTextNode = child;
				}
			}
		}
		for (const {node, startOffset, endOffset} of pos) {
			if (lastChildTextNodeEndOffset != null) {
				continue;
			}
			if (node.nodeName === 'body' && node instanceof Element && node.endTagNode) {
				lastChildTextNodeEndOffset = node.endTagNode.startOffset;
				break;
			}
		}
		for (const {node, startOffset, endOffset} of pos) {
			if (lastChildTextNodeEndOffset != null) {
				continue;
			}
			if (node.nodeName === 'html' && node instanceof Element && node.endTagNode) {
				lastChildTextNodeEndOffset = node.endTagNode.startOffset;
				break;
			}
		}
		if (lastChildTextNode && lastChildTextNodeEndOffset != null) {
			lastChildTextNode.endOffset = lastChildTextNodeEndOffset;
			const raw = rawHtml.slice(lastChildTextNode.startOffset, lastChildTextNode.endOffset);
			lastChildTextNode.raw = raw;
		}

		let lastNode: Node | null = null;
		for (const {node, startOffset, endOffset} of pos) {
			if (node instanceof GhostNode) {
				continue;
			}
			lastNode = node;
		}

		// create Last spaces
		pos.forEach(({node, startOffset, endOffset}, i) => {
			if (i === pos.length - 1) {
				const lastTextContent = rawHtml.slice(endOffset);
				if (!lastTextContent) {
					return;
				}
				const lastTextNode = new TextNode({
					nodeName: '#eof',
					location: {
						line: lastNode ? lastNode.endLine : 0,
						col: lastNode ? lastNode.endCol : 0,
						startOffset: endOffset,
						endOffset: endOffset + lastTextContent.length,
					},
					prevNode: lastNode || null,
					nextNode: node,
					parentNode: null,
					raw: lastTextContent,
				});
				if (lastNode) {
					lastNode.nextNode = lastTextNode;
				}
				pos.push({
					node: lastTextNode,
					startOffset: endOffset,
					endOffset: endOffset + lastTextContent.length,
				});
			}
		});

		this._list = pos.map(p => p.node);
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

	public toDebugMap () {
		return this.list.map((n) => {
			if (n instanceof Node) {
				return `[${n.line}:${n.col}]>[${n.endLine}:${n.endCol}](${n.startOffset},${n.endOffset})${n.nodeName}: ${n.toString().replace(/\n/g, '⏎').replace(/\t/g, '→').replace(/\s/g, '␣')}`;
			} else {
				return `[N/A]>[N/A](N/A)${n.nodeName}: ${n.toString()}`;
			}
		});
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
		if (node instanceof Element && node.endTagNode) {
			await walker(node.endTagNode);
		}
	}
}

function syncWalk (nodeList: (Node | GhostNode)[], walker: SyncWalker) {
	for (const node of nodeList) {
		walker(node);
		if (node instanceof Element || node instanceof InvalidNode || node instanceof OmittedElement) {
			syncWalk(node.childNodes, walker);
		}
		if (node instanceof Element && node.endTagNode) {
			walker(node.endTagNode);
		}
	}
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
				location: {
					line: p5node.__location.line,
					col: p5node.__location.col,
					startOffset: p5node.__location.startOffset,
					endOffset: p5node.__location.startOffset + raw.length,
				},
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
			// bodyの最後の子のテキストノードだけおかしい
			const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
			if (parent && /^(?:script|style)$/i.test(parent.nodeName)) {
				node = new RawTextNode({
					nodeName: p5node.nodeName,
					location: {
						line: p5node.__location.line,
						col: p5node.__location.col,
						startOffset: p5node.__location.startOffset,
						endOffset: p5node.__location.startOffset + raw.length,
					},
					prevNode: prev,
					nextNode: null,
					parentNode: parent,
					raw,
				});
			} else {
				node = new TextNode({
					nodeName: p5node.nodeName,
					location: {
						line: p5node.__location.line,
						col: p5node.__location.col,
						startOffset: p5node.__location.startOffset,
						endOffset: p5node.__location.startOffset + raw.length,
					},
					prevNode: prev,
					nextNode: null,
					parentNode: parent,
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
				location: {
					line: p5node.__location.line,
					col: p5node.__location.col,
					startOffset: p5node.__location.startOffset,
					endOffset: p5node.__location.startOffset + raw.length,
				},
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
							endOffset: attr.raw.length - 1,
						},
						quote: attr.quote,
						equal: attr.equal,
						invalid: attr.invalid,
						raw: attr.raw,
					});
				}
				node = new Element(
					{
						nodeName,
						namespaceURI: p5node.namespaceURI,
						attributes,
						location: {
							line: p5node.__location.line,
							col: p5node.__location.col,
							startOffset: p5node.__location.startOffset,
							endOffset: p5node.__location.startOffset + raw.length,
							startTag: p5node.__location.startTag!,
							endTag: p5node.__location.endTag || null,
						},
						prevNode: prev,
						nextNode: null,
						parentNode: parent,
						raw,
					},
					rawHtml,
				);
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
