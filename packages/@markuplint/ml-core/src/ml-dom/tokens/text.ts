import { ContentModel } from '@markuplint/ml-spec';
import { Document } from '../';
import { IMLDOMText } from '../types';
import { MLASTText } from '@markuplint/ml-ast';
import MLDOMIndentation from './indentation';
import MLDOMNode from './node';
import { RuleConfigValue } from '@markuplint/ml-config';

/**
 * Raw text elements
 *
 * @see https://html.spec.whatwg.org/multipage/syntax.html#raw-text-elements
 */
const rawTextElements = ['script', 'style'];

export default class MLDOMText<T extends RuleConfigValue, O = null> extends MLDOMNode<T, O, MLASTText>
	implements IMLDOMText {
	public readonly type = 'Text';
	public readonly isRawText: boolean;
	public readonly ownModels: Set<ContentModel> = new Set();

	constructor(astNode: MLASTText, document: Document<T, O>) {
		super(astNode, document);
		this.isRawText = this.parentNode ? rawTextElements.includes(this.parentNode.nodeName.toLowerCase()) : false;
	}

	public isWhitespace() {
		return /^\s+$/.test(this.raw);
	}

	/**
	 * @override
	 */
	public get indentation(): MLDOMIndentation<T, O> | null {
		if (this.isRawText) {
			return null;
		}

		const matched = this.raw.match(/^(\s*(?:\r?\n)+\s*)(?:[^\s]+)/);
		if (matched) {
			const spaces = matched[1];
			if (spaces) {
				const spaceLines = spaces.split(/\r?\n/);
				const line = spaceLines.length + this.startLine - 1;
				const lastSpace = spaceLines.pop();
				if (lastSpace != null) {
					return new MLDOMIndentation(this, lastSpace, line);
				}
			}
		}
		return null;
	}
}
