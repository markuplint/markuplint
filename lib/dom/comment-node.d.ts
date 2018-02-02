import { AmbiguousNode, NodeType, NuLocation } from '../dom';
import Node from './node';
export default class CommentNode<T, O> extends Node<T, O> {
    readonly type: NodeType;
    readonly data: string;
    constructor(nodeName: string, location: NuLocation, raw: string, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: AmbiguousNode<T, O>, data: string);
}
