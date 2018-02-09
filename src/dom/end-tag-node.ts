import {
	NodeType,
} from './';

import GhostNode from './ghost-node';
import Node from './node';

export default class EndTagNode<T, O> extends Node<T, O> {
	public readonly type: NodeType = 'EndTag';
	// @ts-ignore
	public readonly startTagNode: Node<T, O> | GhostNode<T, O>;
}
