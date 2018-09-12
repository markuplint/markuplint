import { MLASTInvalidNode } from '@markuplint/ml-ast';
import { RuleConfigValue } from '@markuplint/ml-config';
import { NodeType } from '../types';
import Node from './node';

export default class InvalidNode<T extends RuleConfigValue, O = null> extends Node<T, O, MLASTInvalidNode> {
	public readonly type: NodeType = 'InvalidNode';
}
