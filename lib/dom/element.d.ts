import { AmbiguousNode, Attribute, NodeType } from './';
import EndTagNode from './end-tag-node';
import GhostNode from './ghost-node';
import Node from './node';
export default class Element<T, O> extends Node<T, O> {
    readonly type: NodeType;
    readonly attributes: Attribute[];
    readonly namespaceURI: string;
    childNodes: (Node<T, O> | GhostNode<T, O>)[];
    endTagNode: EndTagNode<T, O> | null;
    obsolete: boolean;
    constructor(nodeName: string, raw: string, line: number, col: number, startOffset: number, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: AmbiguousNode<T, O>, attributes: Attribute[], namespaceURI: string, endTag: EndTagNode<T, O> | null);
    getAttribute(attrName: string): Attribute | undefined;
    hasAttribute(attrName: string): boolean;
    matches(selector: string): boolean;
    readonly id: Attribute | undefined;
    readonly classList: string[];
}
