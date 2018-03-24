import { AmbiguousNode, NodeType, ParentNode } from './';
import Attribute from './attribute';
import EndTagNode from './end-tag-node';
import GhostNode from './ghost-node';
import Node from './node';
import Token from './token';
export default class Element<T, O> extends Node<T, O> {
    readonly type: NodeType;
    readonly attributes: Attribute[];
    readonly namespaceURI: string;
    readonly closeToken: Token;
    childNodes: (Node<T, O> | GhostNode<T, O>)[];
    endTagNode: EndTagNode<T, O> | null;
    obsolete: boolean;
    constructor(nodeName: string, raw: string, line: number, col: number, startOffset: number, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: ParentNode<T, O> | null, attributes: Attribute[], namespaceURI: string, endTag: EndTagNode<T, O> | null);
    readonly raw: string;
    readonly id: Attribute | undefined;
    readonly classList: string[];
    getAttribute(attrName: string): Attribute | undefined;
    hasAttribute(attrName: string): boolean;
    matches(selector: string): boolean;
    private _parseCloseToken;
}
