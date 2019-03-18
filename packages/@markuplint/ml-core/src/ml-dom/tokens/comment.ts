import { MLASTComment } from '@markuplint/ml-ast';
import { RuleConfigValue } from '@markuplint/ml-config';
import { NodeType } from '../types';
import MLDOMNode from './node';

export default class MLDOMComment<T extends RuleConfigValue, O = null> extends MLDOMNode<T, O, MLASTComment> {
	public readonly type: NodeType = 'Comment';
}
