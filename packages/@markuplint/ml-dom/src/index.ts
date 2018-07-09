import Element from './element';
import GhostNode from './ghost-node';
import Node from './node';
import OmittedElement from './omitted-element';
import TextNode from './text-node';

export type NodeType =
	| 'Node'
	| 'Element'
	| 'OmittedElement'
	| 'Text'
	| 'RawText'
	| 'Comment'
	| 'EndTag'
	| 'Doctype'
	| 'Invalid'
	| null;

export class Indentation<T, O> {
	public readonly line: number;
	public readonly node: TextNode<T, O> | null;

	private readonly _originRaw: string;
	private _fixed: string;

	constructor(
		parentTextNode: TextNode<T, O> | null,
		raw: string,
		line: number,
	) {
		this.node = parentTextNode;
		this.line = line;
		this._originRaw = raw;
		this._fixed = raw;
	}

	public get type(): 'tab' | 'space' | 'mixed' | 'none' {
		const raw = this._fixed;
		return raw === ''
			? 'none'
			: /^\t+$/.test(raw)
				? 'tab'
				: /^[^\t]+$/.test(raw)
					? 'space'
					: 'mixed';
	}

	public get width() {
		return this._fixed.length;
	}

	public get raw() {
		return this._fixed;
	}

	public fix(raw: string) {
		const current = this._fixed;
		this._fixed = raw;
		if (this.node) {
			const node = this.node;
			const line = node.line;
			const lines = node.raw.split(/\r?\n/);
			const index = this.line - line;
			if (lines[index] != null) {
				lines[index] = lines[index].replace(current, this._fixed);
			}
			// console.log({ori: this._originRaw, raw, line, lines, index});
			node.fix(lines.join('\n'));
		}
	}
}

// TODO: Refactoring for interfaces of location
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

export interface TagNodeLocation extends ExistentLocation {}

export interface ElementLocation extends TagNodeLocation {
	startTag: TagNodeLocation;
	endTag: TagNodeLocation | null;
}

export type AmbiguousNode<T, O> = Node<T, O> | GhostNode<T, O> | null;
export type ParentNode<T, O> = Element<T, O> | OmittedElement<T, O>;
