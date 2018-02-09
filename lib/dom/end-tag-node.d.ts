import { NodeType } from './';
import GhostNode from './ghost-node';
import Node from './node';
export default class EndTagNode<T, O> extends Node<T, O> {
    readonly type: NodeType;
    readonly startTagNode: Node<T, O> | GhostNode<T, O>;
}
