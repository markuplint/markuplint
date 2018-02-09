import { AmbiguousNode, NodeType } from './';
import Node from './node';
export default class Doctype<T, O> extends Node<T, O> {
    readonly type: NodeType;
    readonly publicId: string | null;
    readonly dtd: string | null;
    constructor(nodeName: string, raw: string, line: number, col: number, startOffset: number, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: AmbiguousNode<T, O>, publicId: string | null, systemId: string | null);
}
