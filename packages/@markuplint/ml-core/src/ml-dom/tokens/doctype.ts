import { MLASTNode } from '@markuplint/ml-ast';
import { RuleConfigValue } from '@markuplint/ml-config';
import { NodeType } from '../types';
import Node from './node';

export default class Doctype<T extends RuleConfigValue, O = null> extends Node<T, O, MLASTNode> {
	public readonly type: NodeType = 'Doctype';
}
