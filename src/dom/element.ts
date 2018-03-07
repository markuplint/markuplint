import {
	AmbiguousNode,
	NodeType,
	ParentNode,
	TagNodeLocation,
} from './';

import Attribute from './attribute';
import EndTagNode from './end-tag-node';
import GhostNode from './ghost-node';
import Node from './node';
import Token from './token';

import cssSelector from './css-selector';

export default class Element<T, O> extends Node<T, O> {
	public readonly type: NodeType = 'Element';
	public readonly attributes: Attribute[];
	public readonly namespaceURI: string;
	public readonly closeToken: Token;
	public childNodes: (Node<T, O> | GhostNode<T, O>)[] = [];
	public endTagNode: EndTagNode<T, O> | null = null;
	public obsolete = false;

	constructor (nodeName: string, raw: string, line: number, col: number, startOffset: number, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: ParentNode<T, O> | null, attributes: Attribute[], namespaceURI: string, endTag: EndTagNode<T, O> | null) {
		super(nodeName, raw, line, col, startOffset, prevNode, nextNode, parentNode);
		this.attributes = attributes;
		this.namespaceURI = namespaceURI;
		this.endTagNode = endTag;

		const ct = this._parseCloseToken();
		// TODO: line, col
		this.closeToken = new Token(`${ct.beforeSpaces}${ct.solidus}>`, 0, 0, 0);
	}

	public get raw () {
		const raw: string[] = [];
		raw.push(`<${this.nodeName}`);
		for (const attr of this.attributes) {
			raw.push(`${attr.beforeSpaces.raw}${attr.raw}`);
		}
		raw.push(this.closeToken.raw);
		return raw.join('');
	}

	public get id () {
		return this.getAttribute('id');
	}

	public get classList (): string[] {
		const classAttr = this.getAttribute('class');
		if (!classAttr || !classAttr.value) {
			return [];
		}
		return classAttr.value.value.split(/\s+/).map(c => c.trim()).filter(c => c);
	}

	public getAttribute (attrName: string) {
		for (const attr of this.attributes) {
			if (attr.name.raw.toLowerCase() === attrName.toLowerCase()) {
				return attr;
			}
		}
	}

	public hasAttribute (attrName: string) {
		return !!this.getAttribute(attrName);
	}

	public matches (selector: string): boolean {
		return cssSelector(selector).match(this);
	}

	private _parseCloseToken () {
		const result: ParsedCloseTokenData = {
			beforeSpaces: '',
			solidus: '',
		};
		const matches = /(\s*)(\/)?>$/.exec(this._fixed);
		if (matches) {
			result.beforeSpaces = matches[1] || '';
			result.solidus = (matches[2] as '' | '/')  || '';
		}
		return result;
	}
}

interface ParsedCloseTokenData {
	beforeSpaces: string;
	solidus: '' | '/';
}
