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
    endOffset: number | null;
}
export interface TagNodeLocation extends ExistentLocation {
    endOffset: number | null;
}
export interface ElementLocation extends TagNodeLocation {
    startTag: TagNodeLocation;
    endTag: TagNodeLocation | null;
}
export interface NodeProperties {
    nodeName: string;
    location: ExistentLocation;
    prevNode: Node | GhostNode | null;
    nextNode: Node | GhostNode | null;
    parentNode: Node | GhostNode | null;
}
export interface GhostNodeProperties {
    nodeName: string;
    prevNode: Node | GhostNode | null;
    nextNode: Node | GhostNode | null;
    parentNode: Node | GhostNode | null;
    childNodes?: (Node | GhostNode)[];
}
export interface ElementProperties extends NodeProperties {
    namespaceURI: string;
    attributes: Attribute[];
    location: ElementLocation;
    raw: string;
}
export interface OmittedElementProperties extends GhostNodeProperties {
    namespaceURI: string;
}
export interface TextNodeProperties extends NodeProperties {
    textContent: string;
    location: ExistentLocation;
    raw: string;
}
export interface CommentNodeProperties extends NodeProperties {
    data: string;
    location: ExistentLocation;
    raw: string;
}
export interface DocTypeProperties extends NodeProperties {
    publicId: string | null;
    systemId: string | null;
    raw: string;
}
export interface EndTagNodeProperties extends NodeProperties {
    startTagNode: Node | GhostNode;
    raw: string;
}
export interface Attribute {
    name: string;
    value: string | null;
    location: ExistentLocation;
    quote: '"' | "'" | null;
    equal: string | null;
    raw: string;
    invalid: boolean;
}
export declare type Walker<N = (Node | GhostNode)> = (node: N) => Promise<void>;
export declare type SyncWalker = (node: Node | GhostNode) => void;
export declare type NodeType = 'Element' | 'OmittedElement' | 'Text' | 'RawText' | 'Comment' | 'EndTag' | 'Doctype' | 'Invalid' | null;
export declare abstract class Node {
    readonly type: NodeType;
    nodeName: string;
    readonly line: number;
    readonly col: number;
    readonly startOffset: number;
    prevNode: Node | GhostNode | null;
    nextNode: Node | GhostNode | null;
    readonly parentNode: Node | GhostNode | null;
    raw: string;
    constructor(props: NodeProperties);
    toString(): string;
    toJSON(): {
        nodeName: string;
        line: number | null;
        col: number | null;
    };
    is(type: NodeType): boolean;
}
export declare abstract class GhostNode {
    readonly type: NodeType;
    nodeName: string;
    prevNode: Node | GhostNode | null;
    nextNode: Node | GhostNode | null;
    readonly parentNode: Node | GhostNode | null;
    raw: string;
    constructor(props: GhostNodeProperties);
    toString(): string;
    toJSON(): {
        nodeName: string;
        isGhost: boolean;
    };
}
export declare class Element extends Node {
    readonly type: NodeType;
    readonly namespaceURI: string;
    readonly attributes: Attribute[];
    childNodes: (Node | GhostNode)[];
    readonly line: number;
    readonly col: number;
    readonly startOffset: number;
    readonly endOffset: number | null;
    readonly startTagLocation: TagNodeLocation | null;
    readonly endTagLocation: TagNodeLocation | null;
    endTagNode: EndTagNode | null;
    constructor(props: ElementProperties);
    getAttribute(attrName: string): Attribute | undefined;
    readonly id: Attribute | undefined;
    toJSON(): {
        nodeName: string;
        line: number | null;
        col: number | null;
        childNodes: (Node | GhostNode)[];
    };
}
export declare class OmittedElement extends GhostNode {
    readonly type: NodeType;
    readonly attributes: never[];
    childNodes: (Node | GhostNode)[];
    constructor(props: OmittedElementProperties);
}
export declare class TextNode extends Node {
    readonly type: NodeType;
    readonly textContent: string;
    readonly line: number;
    readonly col: number;
    readonly startOffset: number;
    constructor(props: TextNodeProperties);
}
export declare class RawTextNode extends TextNode {
    readonly type: NodeType;
    readonly textContent: string;
    readonly line: number;
    readonly col: number;
    readonly startOffset: number;
    constructor(props: TextNodeProperties);
}
export declare class CommentNode extends Node {
    readonly type: NodeType;
    readonly data: string;
    readonly line: number;
    readonly col: number;
    readonly startOffset: number;
    constructor(props: CommentNodeProperties);
}
export declare class Doctype extends Node {
    readonly type: NodeType;
    readonly publicId: string | null;
    readonly dtd: string | null;
    readonly line: number;
    readonly col: number;
    readonly startOffset: number;
    constructor(props: DocTypeProperties);
}
export declare class EndTagNode extends Node {
    readonly type: NodeType;
    readonly startTagNode: Node | GhostNode;
    readonly line: number;
    readonly col: number;
    readonly startOffset: number;
    endOffset: number | null;
    constructor(props: EndTagNodeProperties);
}
export declare class InvalidNode extends GhostNode {
    readonly type: NodeType;
    readonly childNodes: (Node | GhostNode)[];
    constructor(props: GhostNodeProperties);
    toJSON(): {
        nodeName: string;
        childNodes: (Node | GhostNode)[];
        isGhost: boolean;
    };
}
export declare class Document {
    private _raw;
    private _tree;
    private _list;
    constructor(nodeTree: (Node | GhostNode)[], rawHtml: string);
    readonly root: {
        childNodes: (Node | GhostNode)[];
    };
    readonly raw: string;
    readonly list: (Node | GhostNode)[];
    toString(): string;
    toJSON(): any;
    walk(walker: Walker): Promise<void>;
    walkOn(type: 'Element', walker: Walker<Element>): Promise<void>;
    walkOn(type: 'Text', walker: Walker<TextNode>): Promise<void>;
    walkOn(type: 'Comment', walker: Walker<CommentNode>): Promise<void>;
    walkOn(type: 'EndTag', walker: Walker<EndTagNode>): Promise<void>;
    syncWalk(walker: SyncWalker): void;
    getNode(index: number): Node | GhostNode | null;
}
export default function parser(html: string): Document;
