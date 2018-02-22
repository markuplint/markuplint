import {
	AmbiguousNode,
	NodeType,
	ParentNode,
} from './';

import GhostNode from './ghost-node';
import Node from './node';

export default class OmittedElement<T, O> extends GhostNode<T, O> {
	public readonly type: NodeType = 'OmittedElement';
	public readonly attributes: never[] = [];
	public readonly namespaceURI: string;
	public childNodes: (Node<T, O> | GhostNode<T, O>)[] = [];

	constructor (nodeName: string, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: ParentNode<T, O> | null, namespaceURI: string) {
		super(nodeName, prevNode, nextNode, parentNode);
		this.namespaceURI = namespaceURI;
	}
}
