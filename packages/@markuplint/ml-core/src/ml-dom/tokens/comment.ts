import type { IMLDOMComment } from '../types';
import type { MLASTComment } from '@markuplint/ml-ast';
import type { RuleConfigValue } from '@markuplint/ml-config';

import MLDOMNode from './node';

export default class MLDOMComment<T extends RuleConfigValue, O = null>
	extends MLDOMNode<T, O, MLASTComment>
	implements IMLDOMComment
{
	readonly nodeType = 8;
	readonly type = 'Comment';

	get textContent() {
		return this.raw;
	}
}
