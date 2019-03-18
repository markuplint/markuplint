import { MLASTComment } from '@markuplint/ml-ast';
import { RuleConfigValue } from '@markuplint/ml-config';
import { NodeType, IMLDOMComment } from '../types';
import MLDOMNode from './node';

export default class MLDOMComment<T extends RuleConfigValue, O = null> extends MLDOMNode<T, O, MLASTComment>
	implements IMLDOMComment {
	public readonly type = 'Comment';
}
