import {
	AmbiguousNode,
	Attribute,
	NodeType,
	TagNodeLocation,
} from '../dom';

import EndTagNode from './end-tag-node';
import GhostNode from './ghost-node';
import Node from './node';

import cssSelector from './css-selector';

export default class Element<T, O> extends Node<T, O> {
	public readonly type: NodeType = 'Element';
	public readonly attributes: Attribute[];
	public readonly namespaceURI: string;
	public childNodes: (Node<T, O> | GhostNode<T, O>)[] = [];
	public endTagNode: EndTagNode<T, O> | null = null;
	public obsolete = false;

	constructor (nodeName: string, raw: string, line: number, col: number, startOffset: number, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: AmbiguousNode<T, O>, attributes: Attribute[], namespaceURI: string, endTag: EndTagNode<T, O> | null) {
		super(nodeName, raw, line, col, startOffset, prevNode, nextNode, parentNode);
		this.attributes = attributes;
		this.namespaceURI = namespaceURI;
		this.endTagNode = endTag;
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

	public matches (selector: string): boolean {
		return cssSelector(selector).match(this);
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
