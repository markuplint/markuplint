import { MLASTText } from '@markuplint/ml-ast';
import { RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config';
import { NodeType } from '../types';
import Node from './node';

export default class Text<T extends RuleConfigValue, O extends RuleConfigOptions> extends Node<T, O, MLASTText> {
	public readonly type: NodeType = 'Text';
}
