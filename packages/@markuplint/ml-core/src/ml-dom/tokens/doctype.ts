import { MLASTNode } from '@markuplint/ml-ast';
import { RuleConfigValue } from '@markuplint/ml-config';
import { NodeType, IMLDOMDoctype } from '../types';
import MLDOMNode from './node';

export default class MLDOMDoctype<T extends RuleConfigValue, O = null> extends MLDOMNode<T, O, MLASTNode>
	implements IMLDOMDoctype {
	public readonly type = 'Doctype';
}
