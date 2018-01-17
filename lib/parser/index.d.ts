import Ruleset, { ConfigureFileJSONRules } from '../ruleset';
import { CustomRule, RuleConfig } from '../rule';
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
export interface NodeProperties {
    nodeName: string;
    location: ExistentLocation;
    prevNode: Node | GhostNode | null;
    nextNode: Node | GhostNode | null;
    parentNode: Node | GhostNode | null;
    raw: string;
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
}
export interface OmittedElementProperties extends GhostNodeProperties {
    namespaceURI: string;
}
export interface TextNodeProperties extends NodeProperties {
    location: ExistentLocation;
}
export interface CommentNodeProperties extends NodeProperties {
    data: string;
    location: ExistentLocation;
}
export interface DocTypeProperties extends NodeProperties {
    publicId: string | null;
    systemId: string | null;
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
export interface Indentation {
    type: 'tab' | 'space' | 'mixed';
    width: number;
    raw: string;
    line: number;
}
export declare type Walker<T, O, N = (Node<T, O> | GhostNode<T, O>)> = (node: N) => Promise<void>;
export declare type SyncWalker<T, O, N = (Node<T, O> | GhostNode<T, O>)> = (node: N) => void;
export declare type NodeType = 'Element' | 'OmittedElement' | 'Text' | 'RawText' | 'Comment' | 'EndTag' | 'Doctype' | 'Invalid' | null;
export declare abstract class Node<T = null, O = {}> {
    readonly type: NodeType;
    nodeName: string;
    readonly line: number;
    readonly col: number;
    endLine: number;
    endCol: number;
    readonly startOffset: number;
    endOffset: number;
    prevNode: Node<T, O> | GhostNode<T, O> | null;
    nextNode: Node<T, O> | GhostNode<T, O> | null;
    readonly parentNode: Node<T, O> | GhostNode<T, O> | null;
    raw: string;
    prevSyntaxicalNode: Node<T, O> | null;
    indentation: Indentation | null;
    rules: ConfigureFileJSONRules;
    document: Document<T, O>;
    /**
     * @WIP
     */
    depth: number;
    constructor(props: NodeProperties);
    toString(): string;
    toJSON(): {
        nodeName: string;
        line: number | null;
        col: number | null;
    };
    is(type: NodeType): boolean;
    readonly rule: RuleConfig<T, O> | null;
}
export declare abstract class GhostNode<T = null, O = {}> {
    readonly type: NodeType;
    nodeName: string;
    prevNode: Node<T, O> | GhostNode<T, O> | null;
    nextNode: Node<T, O> | GhostNode<T, O> | null;
    readonly parentNode: Node<T, O> | GhostNode<T, O> | null;
    raw: string;
    rules: ConfigureFileJSONRules;
    constructor(props: GhostNodeProperties);
    toString(): string;
}
export declare class Element<T, O> extends Node<T, O> {
    readonly type: NodeType;
    readonly namespaceURI: string;
    readonly attributes: Attribute[];
    childNodes: (Node<T, O> | GhostNode<T, O>)[];
    readonly startTagLocation: TagNodeLocation;
    readonly endTagLocation: TagNodeLocation | null;
    endTagNode: EndTagNode<T, O> | null;
    constructor(props: ElementProperties, rawHtml: string);
    getAttribute(attrName: string): Attribute | undefined;
    hasAttribute(attrName: string): boolean;
    readonly id: Attribute | undefined;
    readonly classList: string[];
}
export declare class OmittedElement<T, O> extends GhostNode<T, O> {
    readonly type: NodeType;
    readonly attributes: never[];
    childNodes: (Node<T, O> | GhostNode)[];
    constructor(props: OmittedElementProperties);
}
export declare class TextNode<T, O> extends Node<T, O> {
    readonly type: NodeType;
}
export declare class RawTextNode<T, O> extends TextNode<T, O> {
    readonly type: NodeType;
}
export declare class CommentNode<T, O> extends Node<T, O> {
    readonly type: NodeType;
    readonly data: string;
    constructor(props: CommentNodeProperties);
}
export declare class Doctype<T, O> extends Node<T, O> {
    readonly type: NodeType;
    readonly publicId: string | null;
    readonly dtd: string | null;
    constructor(props: DocTypeProperties);
}
export declare class EndTagNode<T, O> extends Node<T, O> {
    readonly type: NodeType;
    readonly startTagNode: Node<T, O> | GhostNode<T, O>;
    constructor(props: EndTagNodeProperties);
}
export declare class InvalidNode<T, O> extends Node<T, O> {
    readonly type: NodeType;
    constructor(props: NodeProperties);
}
export declare class Document<T, O> {
    readonly html: Node<T, O> | GhostNode<T, O>;
    readonly head: Node<T, O> | GhostNode<T, O>;
    readonly body: Node<T, O> | GhostNode<T, O>;
    rule: CustomRule<T, O> | null;
    private _raw;
    private _tree;
    private _list;
    private _ruleset;
    constructor(nodeTree: (Node<T, O> | GhostNode<T, O>)[], rawHtml: string, ruleset?: Ruleset);
    readonly raw: string;
    readonly list: (Node<T, O> | GhostNode<T, O>)[];
    toString(): string;
    toJSON(): any;
    toDebugMap(): string[];
    walk(walker: Walker<T, O>): Promise<void>;
    walkOn(type: 'Element', walker: Walker<T, O, Element<T, O>>): Promise<void>;
    walkOn(type: 'Text', walker: Walker<T, O, TextNode<T, O>>): Promise<void>;
    walkOn(type: 'Comment', walker: Walker<T, O, CommentNode<T, O>>): Promise<void>;
    walkOn(type: 'EndTag', walker: Walker<T, O, EndTagNode<T, O>>): Promise<void>;
    syncWalk(walker: SyncWalker<T, O>): void;
    syncWalkOn(type: 'Element', walker: SyncWalker<T, O, Element<T, O>>): void;
    syncWalkOn(type: 'Text', walker: SyncWalker<T, O, TextNode<T, O>>): void;
    syncWalkOn(type: 'Comment', walker: SyncWalker<T, O, CommentNode<T, O>>): void;
    syncWalkOn(type: 'EndTag', walker: SyncWalker<T, O, EndTagNode<T, O>>): void;
    getNode(index: number): Node<T, O> | GhostNode<T, O> | null;
    setRule(rule: CustomRule<T, O> | null): void;
}
export default function parser(html: string, ruleset?: Ruleset): Document<null, {}>;
