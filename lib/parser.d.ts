import * as parse5 from 'parse5';
export declare type Document = parse5.AST.HtmlParser2.Document;
export declare type ParentNode = parse5.AST.HtmlParser2.ParentNode;
export declare type Node = parse5.AST.HtmlParser2.Node;
export declare type Walker = (node: Node) => void;
export declare class NodeTree {
    private _raw;
    constructor(nodeTree: ParentNode[]);
    walk(walker: Walker): void;
}
export default function parser(html: string): NodeTree;
