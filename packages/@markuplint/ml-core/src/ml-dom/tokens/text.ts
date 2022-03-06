import type { Document } from '../';
import type { IMLDOMText } from '../types';
import type { MLASTText } from '@markuplint/ml-ast';
import type { RuleConfigValue } from '@markuplint/ml-config';
import type { ContentModel } from '@markuplint/ml-spec';

import MLDOMNode from './node';

/**
 * Raw text elements
 *
 * @see https://html.spec.whatwg.org/multipage/syntax.html#raw-text-elements
 */
const rawTextElements = ['script', 'style'];

export default class MLDOMText<T extends RuleConfigValue, O = null>
	extends MLDOMNode<T, O, MLASTText>
	implements IMLDOMText
{
	readonly nodeType = 3;
	readonly type = 'Text';
	readonly isRawText: boolean;
	readonly ownModels: Set<ContentModel> = new Set();

	constructor(astNode: MLASTText, document: Document<T, O>) {
		super(astNode, document);
		this.isRawText = this.parentNode ? rawTextElements.includes(this.parentNode.nodeName.toLowerCase()) : false;
	}

	get textContent() {
		return this.raw;
	}

	isWhitespace() {
		return /^\s+$/.test(this.raw);
	}
}
