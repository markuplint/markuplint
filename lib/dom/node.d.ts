import { AmbiguousNode, Indentation, NodeType, ParentNode } from './';
import Document from './document';
import Token from './token';
import { RuleConfig } from '../rule';
import { ConfigureFileJSONRules } from '../ruleset/JSONInterface';
export default abstract class Node<T = null, O = {}> extends Token {
    readonly type: NodeType;
    nodeName: string;
    prevNode: AmbiguousNode<T, O>;
    nextNode: AmbiguousNode<T, O>;
    readonly parentNode: ParentNode<T, O> | null;
    prevSyntaxicalNode: Node<T, O> | null;
    indentation: Indentation<T, O> | null;
    readonly rules: ConfigureFileJSONRules;
    document: Document<T, O> | null;
    /**
     * @WIP
     */
    depth: number;
    constructor(nodeName: string, raw: string, line: number, col: number, startOffset: number, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: ParentNode<T, O> | null);
    toString(): string;
    toJSON(): {
        nodeName: string;
        raw: string;
        line: number;
        col: number;
        endLine: number;
        endCol: number;
        startOffset: number;
        endOffset: number;
    };
    is(type: NodeType): boolean;
    readonly rule: RuleConfig<T, O>;
    readonly syntaxicalParentNode: Node<T, O> | null;
}
