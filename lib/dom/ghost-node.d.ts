import { AmbiguousNode, NodeType } from '../dom';
import { ConfigureFileJSONRules } from '../ruleset/JSONInterface';
export default abstract class GhostNode<T = null, O = {}> {
    readonly type: NodeType;
    nodeName: string;
    prevNode: AmbiguousNode<T, O>;
    nextNode: AmbiguousNode<T, O>;
    readonly parentNode: AmbiguousNode<T, O>;
    raw: string;
    rules: ConfigureFileJSONRules;
    constructor(nodeName: string, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: AmbiguousNode<T, O>);
    toString(): string;
}
