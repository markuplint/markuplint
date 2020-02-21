import Document from '../document';
import { IMLDOMElementCloseTag } from '../types';
import { MLASTElementCloseTag } from '@markuplint/ml-ast';
import MLDOMElement from './element';
import MLDOMNode from './node';
import { RuleConfigValue } from '@markuplint/ml-config';

export default class MLDOMElementCloseTag<T extends RuleConfigValue, O = null>
	extends MLDOMNode<T, O, MLASTElementCloseTag>
	implements IMLDOMElementCloseTag {
	readonly type = 'ElementCloseTag';
	readonly nodeName: string;
	readonly startTag: MLDOMElement<T, O>;
	readonly isForeignElement: boolean;

	#fixedNodeName: string;

	constructor(astNode: MLASTElementCloseTag, document: Document<T, O>, startTag: MLDOMElement<T, O>) {
		super(astNode, document);
		this.nodeName = astNode.nodeName;
		this.#fixedNodeName = astNode.nodeName;
		this.startTag = startTag;
		this.isForeignElement = startTag.isForeignElement;
	}

	get raw() {
		return `</${this.#fixedNodeName}>`;
	}

	get rule() {
		return this.startTag.rule;
	}

	fixNodeName(name: string) {
		this.#fixedNodeName = name;
	}
}
