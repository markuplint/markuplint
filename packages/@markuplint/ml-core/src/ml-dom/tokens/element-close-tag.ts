import type { Document } from '../';
import type { IMLDOMElementCloseTag } from '../types';
import type { MLDOMElement } from './';
import type { MLASTElementCloseTag } from '@markuplint/ml-ast';
import type { RuleConfigValue } from '@markuplint/ml-config';

import { stringSplice } from '../../utils/string-splice';

import MLDOMNode from './node';

export default class MLDOMElementCloseTag<T extends RuleConfigValue, O = null>
	extends MLDOMNode<T, O, MLASTElementCloseTag>
	implements IMLDOMElementCloseTag
{
	readonly type = 'ElementCloseTag';
	readonly nodeName: string;
	readonly startTag: MLDOMElement<T, O>;
	readonly isForeignElement: boolean;
	readonly isCustomElement: boolean;

	readonly #tagOpenChar: string;
	// readonly #tagCloseChar: string;

	#fixedNodeName: string;

	constructor(astNode: MLASTElementCloseTag, document: Document<T, O>, startTag: MLDOMElement<T, O>) {
		super(astNode, document);
		this.nodeName = astNode.nodeName;
		this.#fixedNodeName = astNode.nodeName;
		this.startTag = startTag;
		this.isForeignElement = startTag.isForeignElement;
		this.isCustomElement = astNode.isCustomElement;

		this.#tagOpenChar = astNode.tagOpenChar;
		// this.#tagCloseChar = astNode.tagCloseChar;
	}

	get raw() {
		let fixed = this.originRaw;
		if (this.nodeName !== this.#fixedNodeName) {
			fixed = stringSplice(fixed, this.#tagOpenChar.length, this.nodeName.length, this.#fixedNodeName);
		}

		return fixed;
	}

	get rule() {
		return this.startTag.rule;
	}

	fixNodeName(name: string) {
		this.#fixedNodeName = name;
	}

	getNameLocation() {
		return {
			offset: this.startOffset,
			line: this.startLine,
			col: this.startCol + this.#tagOpenChar.length,
		};
	}
}
