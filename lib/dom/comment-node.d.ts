import { AmbiguousNode, NodeType, ParentNode } from '.';
import Node from './node';
export default class CommentNode<T, O> extends Node<T, O> {
    readonly type: NodeType;
    readonly data: string;
    constructor(nodeName: string, raw: string, line: number, col: number, startOffset: number, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: ParentNode<T, O> | null, data: string);
}
//# sourceMappingURL=comment-node.d.ts.map