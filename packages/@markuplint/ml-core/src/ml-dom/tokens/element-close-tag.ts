import { MLASTElementCloseTag } from '@markuplint/ml-ast';
import { RuleConfigValue } from '@markuplint/ml-config';
import { RuleInfo } from '../../';
import { setNode } from '../helper/dom-traverser';
import { NodeType } from '../types';
import Element from './element';
import Token from './token';

export default class ElementCloseTag<T extends RuleConfigValue, O = null> extends Token<MLASTElementCloseTag> {
	public readonly type: NodeType = 'ElementCloseTag';
	public readonly nodeName: string;
	public readonly startTag: Element<T, O>;
	public readonly isForeignElement: boolean;

	constructor(astNode: MLASTElementCloseTag, startTag: Element<T, O>) {
		super(astNode);
		this.nodeName = astNode.nodeName;
		this.startTag = startTag;
		this.isForeignElement = startTag.isForeignElement;

		// TODO: type
		// @ts-ignore
		setNode(astNode, this);
	}

	public get rule(): RuleInfo<T, O> {
		return this.startTag.rule;
	}
}
