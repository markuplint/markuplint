import { AmbiguousNode, NodeType, ParentNode } from '.';
import GhostNode from './ghost-node';
import Node from './node';
export default class OmittedElement<T, O> extends GhostNode<T, O> {
    readonly type: NodeType;
    readonly attributes: never[];
    readonly namespaceURI: string;
    childNodes: (Node<T, O> | GhostNode<T, O>)[];
    constructor(nodeName: string, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: ParentNode<T, O> | null, namespaceURI: string);
}
