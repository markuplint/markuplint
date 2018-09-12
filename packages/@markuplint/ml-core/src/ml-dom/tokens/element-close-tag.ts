import { MLASTElementCloseTag } from '@markuplint/ml-ast';
import { RuleConfigValue } from '@markuplint/ml-config';
import { setNode } from '../helper/dom-traverser';
import { NodeType } from '../types';
import Element from './element';
import Token from './token';

export default class ElementCloseTag<T extends RuleConfigValue, O = null> extends Token<MLASTElementCloseTag> {
	public readonly type: NodeType = 'ElementCloseTag';
	public readonly startTag: Element<T, O>;

	constructor(astNode: MLASTElementCloseTag, startTag: Element<T, O>) {
		super(astNode);
		this.startTag = startTag;

		// TODO: type
		// @ts-ignore
		setNode(astNode, this);
	}
}
