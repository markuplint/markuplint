import {
	AmbiguousNode,
	NodeType,
	NuLocation,
} from '../dom';

import Node from './node';

export default class CommentNode<T, O> extends Node<T, O> {
	public readonly type: NodeType = 'Comment';
	public readonly data: string;

	constructor (nodeName: string, location: NuLocation, raw: string, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: AmbiguousNode<T, O>, data: string) {
		super(nodeName, location, raw, prevNode, nextNode, parentNode);
		this.data = data;
	}
}
