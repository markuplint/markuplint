import { NodeType } from './';
import Element from './element';
import Node from './node';
export default class EndTagNode<T, O> extends Node<T, O> {
    readonly type: NodeType;
    readonly startTagNode: Element<T, O>;
}
