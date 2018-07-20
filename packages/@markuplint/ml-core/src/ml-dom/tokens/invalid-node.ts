import { MLASTInvalidNode } from '@markuplint/ml-ast/';
import { NodeType } from '../types';
import Node from './node';

export default class InvalidNode<T, O> extends Node<T, O, MLASTInvalidNode> {
	public readonly type: NodeType = 'InvalidNode';
}
