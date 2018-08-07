import { MLASTComment } from '@markuplint/ml-ast';
import { RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config';

import { NodeType } from '../types';
import Node from './node';

export default class Comment<T extends RuleConfigValue, O extends RuleConfigOptions> extends Node<T, O, MLASTComment> {
	public readonly type: NodeType = 'Comment';
}
