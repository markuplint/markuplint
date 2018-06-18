import { AmbiguousNode, NodeType, ParentNode } from '.';
import { ConfigureFileJSONRules } from '../ruleset/JSONInterface';
export default abstract class GhostNode<T = null, O = {}> {
    readonly type: NodeType;
    nodeName: string;
    prevNode: AmbiguousNode<T, O>;
    nextNode: AmbiguousNode<T, O>;
    readonly parentNode: ParentNode<T, O> | null;
    readonly raw: string;
    fixed: string;
    rules: ConfigureFileJSONRules;
    constructor(nodeName: string, prevNode: AmbiguousNode<T, O>, nextNode: AmbiguousNode<T, O>, parentNode: ParentNode<T, O> | null);
    toString(): string;
}
//# sourceMappingURL=ghost-node.d.ts.map