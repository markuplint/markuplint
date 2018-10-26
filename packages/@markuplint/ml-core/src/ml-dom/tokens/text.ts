import { MLASTText } from '@markuplint/ml-ast';
import { RuleConfigValue } from '@markuplint/ml-config';
import { Document, NodeType } from '../';
import Indentation from './indentation';
import Node from './node';

/**
 * Raw text elements
 *
 * @see https://html.spec.whatwg.org/multipage/syntax.html#raw-text-elements
 */
const rawTextElements = ['script', 'style'];

export default class Text<T extends RuleConfigValue, O = null> extends Node<T, O, MLASTText> {
	public readonly type: NodeType = 'Text';
	public readonly isRawText: boolean;

	constructor(astNode: MLASTText, document: Document<T, O>) {
		super(astNode, document);
		this.isRawText = this.parentNode ? rawTextElements.includes(this.parentNode.nodeName.toLowerCase()) : false;
	}

	/**
	 * @override
	 */
	public get indentation(): Indentation<T, O> | null {
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
					return new Indentation(this, lastSpace, line);
				}
			}
		}
		return null;
	}
}
