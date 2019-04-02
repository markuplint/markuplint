import Document from '../document';
import { IMLDOMElementCloseTag } from '../types';
import { MLASTElementCloseTag } from '@markuplint/ml-ast';
import MLDOMElement from './element';
import MLDOMNode from './node';
import { RuleConfigValue } from '@markuplint/ml-config';
import { setNode } from '../helper/dom-traverser';

export default class MLDOMElementCloseTag<T extends RuleConfigValue, O = null>
	extends MLDOMNode<T, O, MLASTElementCloseTag>
	implements IMLDOMElementCloseTag {
	public readonly type = 'ElementCloseTag';
	public readonly nodeName: string;
	public readonly startTag: MLDOMElement<T, O>;
	public readonly isForeignElement: boolean;

	constructor(astNode: MLASTElementCloseTag, document: Document<T, O>, startTag: MLDOMElement<T, O>) {
		super(astNode, document);
		this.nodeName = astNode.nodeName;
		this.startTag = startTag;
		this.isForeignElement = startTag.isForeignElement;
		setNode(astNode, this);
	}

	public get rule() {
		return this.startTag.rule;
	}
}
