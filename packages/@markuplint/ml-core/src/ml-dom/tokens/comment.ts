import { MLASTComment } from '@markuplint/ml-ast/';
import { NodeType } from '../types';
import Node from './node';

export default class Comment<T, O> extends Node<T, O, MLASTComment> {
	public readonly type: NodeType = 'Comment';
}
