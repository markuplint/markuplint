import { MLASTText } from '@markuplint/ml-ast/';
import { NodeType } from '../types';
import Node from './node';

export default class Text<T, O> extends Node<T, O, MLASTText> {
	public readonly type: NodeType = 'Text';
}
