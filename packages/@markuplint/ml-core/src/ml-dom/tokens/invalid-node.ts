import { MLASTInvalidNode } from '@markuplint/ml-ast';
import { RuleConfigValue } from '@markuplint/ml-config';
import { NodeType } from '../types';
import MLDOMNode from './node';

export default class MLDOMInvalidNode<T extends RuleConfigValue, O = null> extends MLDOMNode<T, O, MLASTInvalidNode> {
	public readonly type: NodeType = 'InvalidNode';
}
