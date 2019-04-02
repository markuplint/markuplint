import { IMLDOMInvalidNode } from '../types';
import { MLASTInvalidNode } from '@markuplint/ml-ast';
import MLDOMNode from './node';
import { RuleConfigValue } from '@markuplint/ml-config';

export default class MLDOMInvalidNode<T extends RuleConfigValue, O = null> extends MLDOMNode<T, O, MLASTInvalidNode>
	implements IMLDOMInvalidNode {
	public readonly type = 'InvalidNode';
}
