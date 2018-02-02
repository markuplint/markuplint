import { AmbiguousNode, Indentation, NodeType, NuLocation } from '../dom';
import Document from './document';
import { RuleConfig } from '../rule';
import { ConfigureFileJSONRules } from '../ruleset/JSONInterface';
export default abstract class Node<T = null, O = {}> {
    readonly type: NodeType;
    nodeName: string;
    readonly line: number;
    readonly col: number;
    endLine: number;
    endCol: number;
    readonly startOffset: number;
    endOffset: number;
    prevNode: AmbiguousNode<T, O>;
    nextNode: AmbiguousNode<T, O>;
    readonly parentNode: AmbiguousNode<T, O>;
    raw: string;
    prevSyntaxicalNode: Node<T, O> | null;
    indentation: Indentation | null;
    rules: ConfigureFileJSONRules;
    document: Document<T, O> | null;
    /**
     * @WIP
     */
    depth: number;
    constructor(nodeName: string, location: NuLocation, raw: string, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: AmbiguousNode<T, O>);
    toString(): string;
    toJSON(): {
        nodeName: string;
        line: number | null;
        col: number | null;
    };
    is(type: NodeType): boolean;
    readonly rule: RuleConfig<T, O> | null;
}
