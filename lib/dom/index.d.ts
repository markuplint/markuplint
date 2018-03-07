import Element from './element';
import GhostNode from './ghost-node';
import Node from './node';
import OmittedElement from './omitted-element';
import TextNode from './text-node';
export declare type NodeType = 'Node' | 'Element' | 'OmittedElement' | 'Text' | 'RawText' | 'Comment' | 'EndTag' | 'Doctype' | 'Invalid' | null;
export declare class Indentation<T, O> {
    readonly line: number;
    readonly node: TextNode<T, O> | null;
    private readonly _originRaw;
    private _fixed;
    constructor(parentTextNode: TextNode<T, O> | null, raw: string, line: number);
    readonly type: 'tab' | 'space' | 'mixed' | 'none';
    readonly width: number;
    readonly raw: string;
    fix(raw: string): void;
}
export interface Location {
    line: number | null;
    col: number | null;
    startOffset: number | null;
    endOffset: number | null;
}
export interface ExistentLocation {
    line: number;
    col: number;
    startOffset: number;
    endOffset: number;
}
export interface TagNodeLocation extends ExistentLocation {
}
export interface ElementLocation extends TagNodeLocation {
    startTag: TagNodeLocation;
    endTag: TagNodeLocation | null;
}
export declare type AmbiguousNode<T, O> = Node<T, O> | GhostNode<T, O> | null;
export declare type ParentNode<T, O> = Element<T, O> | OmittedElement<T, O>;
