import { AmbiguousNode, Indentation, NodeType } from './';
import Document from './document';
import Token from './token';
import { RuleConfig } from '../rule';
import { ConfigureFileJSONRules } from '../ruleset/JSONInterface';
export default abstract class Node<T = null, O = {}> extends Token {
    readonly type: NodeType;
    nodeName: string;
    prevNode: AmbiguousNode<T, O>;
    nextNode: AmbiguousNode<T, O>;
    readonly parentNode: AmbiguousNode<T, O>;
    prevSyntaxicalNode: Node<T, O> | null;
    indentation: Indentation | null;
    rules: ConfigureFileJSONRules;
    document: Document<T, O> | null;
    /**
     * @WIP
     */
    depth: number;
    constructor(nodeName: string, raw: string, line: number, col: number, startOffset: number, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: AmbiguousNode<T, O>);
    toString(): string;
    toJSON(): {
        nodeName: string;
        line: number | null;
        col: number | null;
    };
    is(type: NodeType): boolean;
    readonly rule: RuleConfig<T, O> | null;
}
