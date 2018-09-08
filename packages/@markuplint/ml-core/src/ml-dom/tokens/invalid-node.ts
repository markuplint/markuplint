import { MLASTInvalidNode } from '@markuplint/ml-ast';
import { RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config';
import { NodeType } from '../types';
import Node from './node';

export default class InvalidNode<T extends RuleConfigValue, O extends RuleConfigOptions> extends Node<
	T,
	O,
	MLASTInvalidNode
> {
	public readonly type: NodeType = 'InvalidNode';
}
