import type { MLASTHTMLAttr, MLToken } from '@markuplint/ml-ast';

import MLDOMToken from './token';

export default class MLDOMAttribute extends MLDOMToken<MLASTHTMLAttr> {
	readonly nodeType = 2;
	readonly attrType = 'html-attr';
	readonly name: MLDOMToken<MLToken>;
	readonly spacesBeforeName: MLDOMToken<MLToken>;
	readonly spacesBeforeEqual: MLDOMToken<MLToken>;
	readonly equal: MLDOMToken<MLToken>;
	readonly spacesAfterEqual: MLDOMToken<MLToken>;
	readonly startQuote: MLDOMToken<MLToken>;
	readonly valueNode: MLDOMToken<MLToken>;
	readonly endQuote: MLDOMToken<MLToken>;
	readonly isDynamicValue?: true;
	readonly isDirective?: true;
	readonly potentialName: string;
	readonly candidate?: string;
	readonly isDuplicatable: boolean;

	constructor(astToken: MLASTHTMLAttr) {
		super(astToken);

		this.spacesBeforeName = new MLDOMToken(this._astToken.spacesBeforeName);
		this.name = new MLDOMToken(this._astToken.name);
		this.spacesBeforeEqual = new MLDOMToken(this._astToken.spacesBeforeEqual);
		this.equal = new MLDOMToken(this._astToken.equal);
		this.spacesAfterEqual = new MLDOMToken(this._astToken.spacesAfterEqual);
		this.startQuote = new MLDOMToken(this._astToken.startQuote);
		this.valueNode = new MLDOMToken(this._astToken.value);
		this.endQuote = new MLDOMToken(this._astToken.endQuote);
		this.isDynamicValue = astToken.isDynamicValue;
		this.isDirective = astToken.isDirective;
		this.potentialName = astToken.potentialName || this.name.raw;
		this.candidate = astToken.candidate;
		this.isDuplicatable = astToken.isDuplicatable;
	}

	get raw() {
		const raw = [this.name.raw];
		if (this.equal.raw === '=') {
			raw.push(this.spacesBeforeEqual.raw);
			raw.push(this.equal.raw);
			raw.push(this.spacesAfterEqual.raw);
			raw.push(this.startQuote.raw);
			raw.push(this.valueNode.raw);
			raw.push(this.endQuote.raw);
		}
		return raw.join('');
	}

	get startOffset() {
		return this.name.startOffset;
	}

	get endOffset() {
		return this.endQuote.endOffset;
	}

	get startLine() {
		return this.name.startLine;
	}

	get endLine() {
		return this.endQuote.endLine;
	}

	get startCol() {
		return this.name.startCol;
	}

	get endCol() {
		return this.endQuote.endCol;
	}

	get value() {
		const value = this.getValue();
		return value.raw;
	}

	getName() {
		return {
			line: this.name.startLine,
			col: this.name.startCol,
			potential: this.potentialName,
			raw: this.name.raw,
		};
	}

	getValue() {
		return {
			line: this.valueNode.startLine,
			col: this.valueNode.startCol,
			potential: this.valueNode.raw,
			raw: this.valueNode.raw,
		};
	}

	toString(withSpace = true) {
		return (withSpace ? this.spacesBeforeName.raw : '') + this.raw;
	}

	toNormalizeString() {
		return (
			this.name.originRaw +
			this.equal.originRaw +
			this.startQuote.originRaw +
			this.valueNode.originRaw +
			this.endQuote.originRaw
		);
	}
}
