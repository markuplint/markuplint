export interface NodeLocation {
    line: number;
    col: number;
    startOffset: number;
    endOffset: number | null;
}
export interface TagNodeLocation extends NodeLocation {
    endOffset: number;
}
export interface ElementLocation extends NodeLocation {
    startTag: TagNodeLocation | null;
    endTag: TagNodeLocation | null;
}
export interface NodeProperties {
    nodeName: string;
    location: NodeLocation | null;
    prevNode: Node | null;
    nextNode: Node | null;
    parentNode: Node | null;
}
export interface ElementProperties extends NodeProperties {
    namespaceURI: string;
    attributes: Attribute[];
    location: ElementLocation;
    raw: string;
}
export interface TextNodeProperties extends NodeProperties {
    textContent: string;
    location: NodeLocation;
    raw: string;
}
export interface CommentNodeProperties extends NodeProperties {
    data: string;
    location: NodeLocation;
    raw: string;
}
export interface DocTypeProperties extends NodeProperties {
    publicId: string | null;
    systemId: string | null;
}
export interface InvalidNodeProperties extends NodeProperties {
    childNodes: Node[];
    location: null;
}
export interface EndTagNodeProperties extends NodeProperties {
    startTagNode: Node;
    raw: string;
}
export interface Attribute {
    name: string;
    value: string | null;
    location: NodeLocation;
    quote: '"' | "'" | null;
    equal: string | null;
    raw: string;
    invalid: boolean;
}
export declare type Walker<N = Node> = (node: N) => Promise<void>;
export declare type SyncWalker = (node: Node) => void;
export declare type NodeType = 'Element' | 'Text' | 'Comment' | 'EndTag' | 'Doctype' | 'Invalid' | null;
export declare abstract class Node {
    readonly type: NodeType;
    nodeName: string;
    readonly line: number;
    readonly col: number;
    readonly startOffset: number;
    prevNode: Node | null;
    nextNode: Node | null;
    readonly parentNode: Node | null;
    raw: string;
    constructor(props: NodeProperties);
    toString(): string;
    is(type: NodeType): boolean;
}
export declare class Element extends Node {
    readonly type: NodeType;
    readonly namespaceURI: string;
    readonly attributes: Attribute[];
    childNodes: Node[];
    readonly endOffset: number | null;
    readonly startTagLocation: TagNodeLocation | null;
    readonly endTagLocation: TagNodeLocation | null;
    endTagNode: EndTagNode | null;
    constructor(props: ElementProperties);
    getAttribute(attrName: string): Attribute | undefined;
    readonly id: Attribute | undefined;
}
export declare class TextNode extends Node {
    readonly type: NodeType;
    readonly textContent: string;
    constructor(props: TextNodeProperties);
}
export declare class CommentNode extends Node {
    readonly type: NodeType;
    readonly data: string;
    constructor(props: CommentNodeProperties);
}
export declare class Doctype extends Node {
    readonly type: NodeType;
    readonly publicId: string | null;
    readonly dtd: string | null;
    constructor(props: DocTypeProperties);
}
export declare class EndTagNode extends Node {
    readonly type: NodeType;
    readonly startTagNode: Node;
    endOffset: number | null;
    constructor(props: EndTagNodeProperties);
}
export declare class InvalidNode extends Node {
    readonly type: NodeType;
    readonly childNodes: Node[];
    constructor(props: InvalidNodeProperties);
}
export declare class Document {
    private _raw;
    private _tree;
    private _list;
    constructor(nodes: Node[], rawHtml: string);
    readonly root: {
        childNodes: Node[];
    };
    readonly raw: string;
    walk(walker: Walker): Promise<void>;
    walkOn(type: 'Element', walker: Walker<Element>): Promise<void>;
    walkOn(type: 'Text', walker: Walker<TextNode>): Promise<void>;
    walkOn(type: 'Comment', walker: Walker<CommentNode>): Promise<void>;
    walkOn(type: 'EndTag', walker: Walker<EndTagNode>): Promise<void>;
    syncWalk(walker: SyncWalker): void;
    getNode(index: number): Node | null;
}
export default function parser(html: string): Document;
