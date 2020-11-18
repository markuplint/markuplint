import { IMLDOMComment } from '../types';
import { MLASTComment } from '@markuplint/ml-ast';
import MLDOMNode from './node';
import { RuleConfigValue } from '@markuplint/ml-config';

export default class MLDOMComment<T extends RuleConfigValue, O = null>
	extends MLDOMNode<T, O, MLASTComment>
	implements IMLDOMComment {
	readonly type = 'Comment';
}
