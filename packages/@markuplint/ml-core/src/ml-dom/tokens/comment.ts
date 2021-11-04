import type { IMLDOMComment } from '../types';
import type { MLASTComment } from '@markuplint/ml-ast';
import MLDOMNode from './node';
import type { RuleConfigValue } from '@markuplint/ml-config';

export default class MLDOMComment<T extends RuleConfigValue, O = null>
	extends MLDOMNode<T, O, MLASTComment>
	implements IMLDOMComment
{
	readonly type = 'Comment';
}
