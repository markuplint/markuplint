import { AmbiguousNode, NodeType } from '../dom';
import GhostNode from './ghost-node';
import Node from './node';
export default class OmittedElement<T, O> extends GhostNode<T, O> {
    readonly type: NodeType;
    readonly attributes: never[];
    readonly namespaceURI: string;
    childNodes: (Node<T, O> | GhostNode)[];
    constructor(nodeName: string, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: AmbiguousNode<T, O>, namespaceURI: string);
}
