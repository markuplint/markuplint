import { IMLDOMDoctype } from '../types';
import { MLASTNode } from '@markuplint/ml-ast';
import MLDOMNode from './node';
import { RuleConfigValue } from '@markuplint/ml-config';

export default class MLDOMDoctype<T extends RuleConfigValue, O = null> extends MLDOMNode<T, O, MLASTNode>
	implements IMLDOMDoctype {
	public readonly type = 'Doctype';
}
