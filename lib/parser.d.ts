import * as parse5 from 'parse5';
export declare type P5Document = parse5.AST.HtmlParser2.Document;
export declare type P5ParentNode = parse5.AST.HtmlParser2.ParentNode & {
    nodeName: string;
    __location: {
        line: number;
        col: number;
        startOffset: number;
        endOffeset: number;
    };
};
export declare type P5Node = parse5.AST.HtmlParser2.Node;
export declare type Walker = (node: Node) => void;
export declare class Node {
    readonly nodeName: string;
    readonly line: number;
    readonly s: number;
    constructor(node: P5ParentNode);
}
export declare class Doctype extends Node {
    readonly publicId: string | null;
    readonly dtd: string | null;
    constructor(node: P5ParentNode);
}
export declare class NodeTree {
    private _docType;
    private _;
    constructor(nodeTree: P5ParentNode[]);
    walk(walker: Walker): void;
    getNode(index: number): Node | null;
}
export default function parser(html: string): NodeTree;
