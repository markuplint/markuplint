import { NodeType } from '.';
import Element from './element';
import Node from './node';
export default class EndTagNode<T, O> extends Node<T, O> {
    readonly type: NodeType;
    readonly startTagNode: Element<T, O>;
    readonly isForeignElement: boolean;
    readonly isPotentialCustomElement: boolean;
    readonly raw: string;
}
//# sourceMappingURL=end-tag-node.d.ts.map