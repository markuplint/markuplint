import {
	AmbiguousNode,
	NodeType,
} from './';

import Node from './node';

export default class Doctype<T, O> extends Node<T, O> {
	public readonly type: NodeType = 'Doctype';
	public readonly publicId: string | null;
	public readonly dtd: string | null;

	constructor (nodeName: string, raw: string, line: number, col: number, startOffset: number, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, publicId: string | null, systemId: string | null) {
		super(nodeName, raw, line, col, startOffset, prevNode, nextNode, null);
		this.publicId = publicId;
		this.dtd = systemId;
	}
}
