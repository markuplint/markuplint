import Element from './element';
import GhostNode from './ghost-node';
import Node from './node';
import OmittedElement from './omitted-element';
import TextNode from './text-node';

export type NodeType = 'Node' | 'Element' | 'OmittedElement' | 'Text' | 'RawText' | 'Comment' | 'EndTag' | 'Doctype' | 'Invalid' | null;

// export interface Indentation {
// 	type: 'tab' | 'space' | 'mixed' | 'none';
// 	width: number;
// 	raw: string;
// 	line: number;
// }

export class Indentation<T, O> {

	private static set<T, O> (ind: Indentation<T, O>, raw: string) {
		ind.type = raw === '' ? 'none' : /^\t+$/.test(raw) ? 'tab' : /^[^\t]+$/.test(raw) ? 'space' : 'mixed',
		ind.width = raw.length;
		ind.raw = raw;
	}

	public type!: 'tab' | 'space' | 'mixed' | 'none';
	public width!: number;
	public raw!: string;
	public readonly line: number;
	public readonly parentTextNode: TextNode<T, O> | null;

	private _fix: string;

	constructor (parentTextNode: TextNode<T, O> | null, raw: string, line: number) {
		Indentation.set(this, raw);
		this.parentTextNode = parentTextNode;
		this.line = line;
		this._fix = raw;
	}

	public set fix (ind: string) {
		this._fix = ind;
		if (this.parentTextNode) {
			const node = this.parentTextNode;
			const line = node.line;
			const lines = node.fixed.split(/\r?\n/);
			const index = this.line - line;
			if (lines[index] != null) {
				lines[index] = lines[index].replace(this.raw, this._fix);
			}
			// console.log({line, lines, index});
			node.fixed = lines.join('\n');
		}
	}

	public get fix () {
		return this._fix;
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

export interface TagNodeLocation extends ExistentLocation {
}

export interface ElementLocation extends TagNodeLocation {
	startTag: TagNodeLocation;
	endTag: TagNodeLocation | null;
}

export type AmbiguousNode<T, O> = Node<T, O> | GhostNode<T, O> | null;
export type ParentNode<T, O> = Element<T, O> | OmittedElement<T, O>;
