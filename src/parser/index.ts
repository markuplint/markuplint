import * as parse5 from 'parse5';

import {
	parseRawTag,
	RawAttribute,
} from './parseRawTag';

import Ruleset, {
	ConfigureFileJSONRules,
	ConfigureFileJSONRuleOption,
	NodeRule,
} from '../ruleset';

import {
	CustomRule,
	RuleConfig,
} from '../rule';

import cssSelector from './cssSelector';
import getCol from './getCol';
import getLine from './getLine';
import tagSplitter from './tagSplitter';

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

export interface Indentation {
	type: 'tab' | 'space' | 'mixed';
	width: number;
	raw: string;
	line: number;
}

export type Walker<T, O, N = (Node<T, O> | GhostNode<T, O>)> = (node: N) => Promise<void>;
export type SyncWalker<T, O, N = (Node<T, O> | GhostNode<T, O>)> = (node: N) => void;

export type NodeType = 'Node' | 'Element' | 'OmittedElement' | 'Text' | 'RawText' | 'Comment' | 'EndTag' | 'Doctype' | 'Invalid' | null;

export abstract class Node<T = null, O = {}> {
	public readonly type: NodeType = 'Node';
	public nodeName: string;
	public readonly line: number;
	public readonly col: number;
	public endLine: number;
	public endCol: number;
	public readonly startOffset: number;
	public endOffset: number;
	public prevNode: Node<T, O> | GhostNode<T, O> | null = null;
	public nextNode: Node<T, O> | GhostNode<T, O> | null = null;
	public readonly parentNode: Node<T, O> | GhostNode<T, O> | null = null;
	public raw = '';
	public prevSyntaxicalNode: Node<T, O> | null = null;
	public indentation: Indentation | null = null;
	public rules: ConfigureFileJSONRules = {};
	public document: Document<T, O> | null = null;

	/**
	 * @WIP
	 */
	public depth = 0;

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

	public get rule () {
		if (!this.document) {
			return null;
		}
		if (!this.document.rule) {
			return null;
		}
		const name = this.document.rule.name;
		// @ts-ignore
		const rule: ConfigureFileJSONRuleOption<T, O> = this.rules[name];
		if (rule == null) {
			return null;
		}
		return this.document.rule.optimizeOption(rule);
	}
}

export abstract class GhostNode<T = null, O = {}> {
	public readonly type: NodeType = null;
	public nodeName: string;
	public prevNode: Node<T, O> | GhostNode<T, O> | null = null;
	public nextNode: Node<T, O> | GhostNode<T, O> | null = null;
	public readonly parentNode: Node<T, O> | GhostNode<T, O> | null = null;
	public raw = '';
	public rules: ConfigureFileJSONRules = {};

	constructor (props: GhostNodeProperties) {
		this.nodeName = props.nodeName;
		this.prevNode = props.prevNode;
		this.nextNode = props.nextNode;
		this.parentNode = props.parentNode;
	}

	public toString () {
		return this.raw;
	}
}

export class Element<T, O> extends Node<T, O> {
	public readonly type: NodeType = 'Element';
	public readonly namespaceURI: string;
	public readonly attributes: Attribute[];
	public childNodes: (Node<T, O> | GhostNode<T, O>)[] = [];
	public readonly startTagLocation: TagNodeLocation;
	public readonly endTagLocation: TagNodeLocation | null = null;
	public endTagNode: EndTagNode<T, O> | null = null;
	public obsolete = false;

	constructor (props: ElementProperties, rawHtml: string) {
		super(props);
		this.namespaceURI = props.namespaceURI;
		this.attributes = props.attributes;
		this.startTagLocation = props.location.startTag;
		this.endTagLocation = props.location.endTag || null;

		if (this.endTagLocation && this.endTagLocation.startOffset != null && this.endTagLocation.endOffset != null) {
			const endTagRaw = rawHtml.slice(this.endTagLocation.startOffset, this.endTagLocation.endOffset);
			const endTagName = endTagRaw.replace(/^<\/((?:[a-z]+:)?[a-z]+(?:-[a-z]+)*)\s*>/i, '$1');
			const endTag = new EndTagNode<T, O>({
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

	public hasAttribute (attrName: string) {
		return !!this.getAttribute(attrName);
	}

	public get id () {
		return this.getAttribute('id');
	}

	public get classList () {
		const classAttr = this.getAttribute('class');
		if (!classAttr || !classAttr.value) {
			return [''];
		}
		return classAttr.value.split(/\s+/).map(c => c.trim()).filter(c => c);
	}
}

export class OmittedElement<T, O> extends GhostNode<T, O> {
	public readonly type: NodeType = 'OmittedElement';
	public readonly attributes: never[] = [];
	public childNodes: (Node<T, O> | GhostNode)[] = [];

	constructor (props: OmittedElementProperties) {
		super(props);
	}
}

export class TextNode<T, O> extends Node<T, O> {
	public readonly type: NodeType = 'Text';
}

export class RawTextNode<T, O> extends TextNode<T, O> {
	public readonly type: NodeType = 'RawText';
}

export class CommentNode<T, O> extends Node<T, O> {
	public readonly type: NodeType = 'Comment';
	public readonly data: string;

	constructor (props: CommentNodeProperties) {
		super(props);
		this.data = props.data;
	}
}

export class Doctype<T, O> extends Node<T, O> {
	public readonly type: NodeType = 'Doctype';
	public readonly publicId: string | null;
	public readonly dtd: string | null;

	constructor (props: DocTypeProperties) {
		super(props);
		this.publicId = props.publicId;
		this.dtd = props.systemId;
	}
}

export class EndTagNode<T, O> extends Node<T, O> {
	public readonly type: NodeType = 'EndTag';
	public readonly startTagNode: Node<T, O> | GhostNode<T, O>;

	constructor (props: EndTagNodeProperties) {
		super(props);
		this.startTagNode = props.startTagNode;
	}
}

export class InvalidNode<T, O> extends Node<T, O> {
	public readonly type: NodeType = 'Invalid';

	constructor (props: NodeProperties) {
		super(props);
	}
}

interface SortableNode<T, O> {
	node: Node<T, O> | GhostNode<T, O>;
	startOffset: number;
	endOffset: number;
}

export class Document<T, O> {
	public rule: CustomRule<T, O> | null = null;

	private _raw: string;
	private _tree: (Node<T, O> | GhostNode<T, O>)[] = [];
	private _list: (Node<T, O> | GhostNode<T, O>)[] = [];
	private _ruleset: Ruleset | null = null;

	// tslint:disable-next-line:cyclomatic-complexity
	constructor (nodeTree: (Node<T, O> | GhostNode<T, O>)[], rawHtml: string, ruleset?: Ruleset) {
		this._raw = rawHtml;
		this._tree = nodeTree;
		this._ruleset = ruleset || null;

		const pos: SortableNode<T, O>[] = [];

		let prevLine = 1;
		let prevCol = 1;
		let currentStartOffset = 0;
		let currentEndOffset = 0;
		syncWalk<T, O>(nodeTree, (node) => {
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

		let lastNode: Node<T, O> | null = null;
		for (const {node, startOffset, endOffset} of pos) {
			if (node instanceof GhostNode) {
				continue;
			}
			lastNode = node;
		}

		// remove duplicated node
		const stack: {[pos: string]: number} = {};
		const removeIndexes: number[] = [];
		pos.forEach(({node, startOffset, endOffset}, i) => {
			if (node instanceof Node) {
				const id = `${node.line}:${node.col}:${node.endLine}:${node.endCol}`;
				if (stack[id] != null) {
					const iA = stack[id];
					const iB = i;
					const a = pos[iA].node;
					const b = node;
					if (a instanceof InvalidNode && b instanceof InvalidNode) {
						removeIndexes.push(iB);
					} else if (a instanceof InvalidNode) {
						removeIndexes.push(iA);
					} else {
						removeIndexes.push(iB);
					}
				}
				stack[id] = i;
			}
		});
		let r = pos.length;
		while (r--) {
			if (removeIndexes.includes(r)) {
				pos.splice(r, 1);
			}
		}

		// create Last spaces
		pos.forEach(({node, startOffset, endOffset}, i) => {
			if (i === pos.length - 1) {
				const lastTextContent = rawHtml.slice(endOffset);
				if (!lastTextContent) {
					return;
				}
				const lastTextNode = new TextNode({
					nodeName: '#text',
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

		this._list = [];

		let prevSyntaxicalNode: Node<T, O> | null = null;
		pos.map(p => p.node).forEach((node) => {
			if (node instanceof Node) {
				node.prevSyntaxicalNode = prevSyntaxicalNode;
				prevSyntaxicalNode = node;
				if (node.prevSyntaxicalNode instanceof TextNode) {
					const prevSyntaxicalTextNode = node.prevSyntaxicalNode;

					// concat contiguous textNodes
					if (node instanceof TextNode) {
						prevSyntaxicalTextNode.endLine = node.endLine;
						prevSyntaxicalTextNode.endCol = node.endCol;
						prevSyntaxicalTextNode.endOffset = node.endOffset;
						prevSyntaxicalTextNode.raw = prevSyntaxicalTextNode.raw + node.raw;
						prevSyntaxicalNode = prevSyntaxicalTextNode;
						return;
					}
				}
			}
			this._list.push(node);
		});

		for (const node of this._list) {
			if (node instanceof Node) {
				// set self
				node.document = this;

				// indentation meta-infomation
				if (node.prevSyntaxicalNode instanceof TextNode) {
					const prevSyntaxicalTextNode: TextNode<T, O> = node.prevSyntaxicalNode;

					if (!(prevSyntaxicalTextNode instanceof RawTextNode)) {
						const matched = prevSyntaxicalTextNode.raw.match(/\r?\n([ \t]+$)/);
						if (matched) {
							const spaces = matched[1];
							if (spaces) {
								node.indentation = {
									type: /^\t+$/.test(spaces) ? 'tab' : /^[^\t]+$/.test(spaces) ? 'space' : 'mixed',
									width: spaces.length,
									raw: spaces,
									line: node.line,
								};
							}
						}
					}
				}
				if (node instanceof TextNode && !(node instanceof RawTextNode)) {
					const matched = node.raw.match(/(^\s*)([^\s]+)/);
					if (matched) {
						const spaces = matched[1];
						if (spaces) {
							const spaceLines = spaces.split(/\r?\n/);
							const line = spaceLines.length + node.line - 1;
							const lastSpace = spaceLines.pop();
							if (lastSpace) {
								node.indentation = {
									type: /^\t+$/.test(lastSpace) ? 'tab' : /^[^\t]+$/.test(lastSpace) ? 'space' : 'mixed',
									width: lastSpace.length,
									raw: lastSpace,
									line,
								};
							}
						}
					}
				}

			}
		}

		if (this._ruleset) {
			// nodeRules
			const _ruleset = this._ruleset;
			// tslint:disable-next-line:cyclomatic-complexity
			this.syncWalk((node) => {
				for (const ruleName in _ruleset.rules) {
					if (_ruleset.rules.hasOwnProperty(ruleName)) {
						const rule = _ruleset.rules[ruleName];
						node.rules[ruleName] = rule;
					}
				}
				for (const nodeRule of _ruleset.nodeRules) {
					if (nodeRule.rules) {
						for (const ruleName in nodeRule.rules) {
							if (nodeRule.rules.hasOwnProperty(ruleName)) {
								const rule = nodeRule.rules[ruleName];
								if (nodeRule.tagName || nodeRule.selector) {
									if (nodeRule.tagName === node.nodeName) {
										node.rules[ruleName] = rule;
									} else if (nodeRule.selector && node instanceof Element) {
										const selector = cssSelector(nodeRule.selector);
										// console.log({ m: selector.match(node), s: nodeRule.selector, n: node.raw });
										if (selector.match(node)) {
											node.rules[ruleName] = rule;
										}
									}
								}
							}
						}
					}
					if (node instanceof Element) {
						if (node.nodeName.toLowerCase() === nodeRule.tagName) {
							node.obsolete = !!nodeRule.obsolete;
						}
					}
				}
			});
			// childNodeRules
			const stackNodes: [(Element<T, O> | OmittedElement<T, O>), string, boolean | ConfigureFileJSONRuleOption<null, {}>, boolean][] = [];
			this.syncWalk((node) => {
				if (node instanceof Element || node instanceof OmittedElement) {
					for (const nodeRule of _ruleset.childNodeRules) {
						if (nodeRule.rules) {
							for (const ruleName in nodeRule.rules) {
								if (nodeRule.rules.hasOwnProperty(ruleName)) {
									const rule = nodeRule.rules[ruleName];
									if (nodeRule.tagName || nodeRule.selector) {
										if (nodeRule.tagName === node.nodeName) {
											stackNodes.push([node, ruleName, rule, !!nodeRule.inheritance]);
										} else if (nodeRule.selector && node instanceof Element) {
											const selector = cssSelector(nodeRule.selector);
											if (selector.match(node)) {
												stackNodes.push([node, ruleName, rule, !!nodeRule.inheritance]);
											}
										}
									}
								}
							}
						}
					}
				}
			});
			for (const stackNode of stackNodes) {
				const node = stackNode[0];
				const ruleName = stackNode[1];
				const rule = stackNode[2];
				const inheritance = stackNode[3];
				if (inheritance) {
					syncWalk(node.childNodes, (childNode) => {
						childNode.rules[ruleName] = rule;
					});
				} else {
					for (const childNode of node.childNodes) {
						childNode.rules[ruleName] = rule;
					}
				}
			}
		}
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
				return `[${n.line}:${n.col}]>[${n.endLine}:${n.endCol}](${n.startOffset},${n.endOffset})${n instanceof OmittedElement ? '???' : ''}${n.nodeName}: ${n.toString().replace(/\n/g, '⏎').replace(/\t/g, '→').replace(/\s/g, '␣')}`;
			} else {
				return `[N/A]>[N/A](N/A)${n.nodeName}: ${n.toString()}`;
			}
		});
	}

	public async walk (walker: Walker<T, O>) {
		for (const node of this._list) {
			await walker(node);
		}
	}

	public async walkOn (type: 'Node', walker: Walker<T, O, Node<T, O>>): Promise<void>;
	public async walkOn (type: 'Element', walker: Walker<T, O, Element<T, O>>): Promise<void>;
	public async walkOn (type: 'Text', walker: Walker<T, O, TextNode<T, O>>): Promise<void>;
	public async walkOn (type: 'Comment', walker: Walker<T, O, CommentNode<T, O>>): Promise<void>;
	public async walkOn (type: 'EndTag', walker: Walker<T, O, EndTagNode<T, O>>): Promise<void>;
	public async walkOn (type: NodeType, walker: Walker<T, O, any>): Promise<void> { // tslint:disable-line:no-any
		for (const node of this._list) {
			if (node instanceof Node) {
				if (type === 'Node') {
					await walker(node);
				} else if (node.is(type)) {
					await walker(node);
				}
			}
		}
	}

	public syncWalk (walker: SyncWalker<T, O>) {
		for (const node of this._list) {
			walker(node);
		}
	}

	public syncWalkOn (type: 'Node', walker: SyncWalker<T, O, Node<T, O>>): void;
	public syncWalkOn (type: 'Element', walker: SyncWalker<T, O, Element<T, O>>): void;
	public syncWalkOn (type: 'Text', walker: SyncWalker<T, O, TextNode<T, O>>): void;
	public syncWalkOn (type: 'Comment', walker: SyncWalker<T, O, CommentNode<T, O>>): void;
	public syncWalkOn (type: 'EndTag', walker: SyncWalker<T, O, EndTagNode<T, O>>): void;
	public syncWalkOn (type: NodeType, walker: SyncWalker<T, O, any>): void { // tslint:disable-line:no-any
		for (const node of this._list) {
			if (node instanceof Node) {
				if (type === 'Node') {
					walker(node);
				} else if (node.is(type)) {
					walker(node);
				}
			}
		}
	}

	public getNode (index: number): Node<T, O> | GhostNode<T, O> | null {
		return this._tree[index];
	}

	public setRule (rule: CustomRule<T, O> | null) {
		this.rule = rule;
	}
}

async function walk<T, O> (nodeList: (Node | GhostNode)[], walker: Walker<T, O>) {
	for (const node of nodeList) {
		await walker(node);
		if (node instanceof Element || node instanceof OmittedElement) {
			await walk(node.childNodes, walker);
		}
		if (node instanceof Element && node.endTagNode) {
			await walker(node.endTagNode);
		}
	}
}

function syncWalk<T, O> (nodeList: (Node<T, O> | GhostNode<T, O>)[], walker: SyncWalker<T, O>) {
	for (const node of nodeList) {
		walker(node);
		if (node instanceof Element || node instanceof OmittedElement) {
			syncWalk(node.childNodes, walker);
		}
		if (node instanceof Element && node.endTagNode) {
			walker(node.endTagNode);
		}
	}
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
			const node = new Doctype({
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
			nodes.push(node);
			break;
		}
		case '#text': {
			if (!p5node.__location) {
				throw new Error('Invalid Syntax');
			}
			const raw = rawHtml.slice(p5node.__location.startOffset, p5node.__location.endOffset || p5node.__location.startOffset);
			if (parent && /^(?:script|style)$/i.test(parent.nodeName)) {
				const node = new RawTextNode<T, O>({
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
				nodes.push(node);
			} else {
				const tokens = tagSplitter(raw, p5node.__location.line, p5node.__location.col);
				let startOffset = p5node.__location.startOffset;

				for (const token of tokens) {
					const endOffset = startOffset + token.raw.length;
					if (token.type === 'text') {
						const node = new TextNode<T, O>({
							nodeName: p5node.nodeName,
							location: {
								line: token.line,
								col: token.col,
								startOffset,
								endOffset,
							},
							prevNode: prev,
							nextNode: null,
							parentNode: parent,
							raw: token.raw,
						});
						prev = node;
						startOffset = endOffset;
						nodes.push(node);
					} else {
						const node = new InvalidNode<T, O>({
							nodeName: '#invalid',
							location: {
								line: token.line,
								col: token.col,
								startOffset,
								endOffset,
							},
							prevNode: prev,
							nextNode: null,
							parentNode: parent,
							raw: token.raw,
						});
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
			const node = new CommentNode<T, O>({
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
				node = new Element<T, O>(
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
				node = new OmittedElement<T, O>({
					nodeName: p5node.nodeName,
					namespaceURI: p5node.namespaceURI,
					prevNode: prev,
					nextNode: null,
					parentNode: parent,
				});
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
