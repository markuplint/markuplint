import { NodeType } from '../dom';
import Node from './node';
export default class TextNode<T, O> extends Node<T, O> {
    readonly type: NodeType;
}
