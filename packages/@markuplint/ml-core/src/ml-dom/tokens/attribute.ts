import { MLASTHTMLAttr, MLToken } from '@markuplint/ml-ast';
import MLDOMToken from './token';

export default class MLDOMAttribute extends MLDOMToken<MLASTHTMLAttr> {
	readonly attrType = 'html-attr';
	readonly name: MLDOMToken<MLToken>;
	readonly spacesBeforeName: MLDOMToken<MLToken>;
	readonly spacesBeforeEqual: MLDOMToken<MLToken>;
	readonly equal: MLDOMToken<MLToken>;
	readonly spacesAfterEqual: MLDOMToken<MLToken>;
	readonly startQuote: MLDOMToken<MLToken>;
	readonly value: MLDOMToken<MLToken>;
	readonly endQuote: MLDOMToken<MLToken>;
	readonly isDynamicValue?: true;
	readonly isDirective?: true;
	readonly potentialName: string;

	constructor(astToken: MLASTHTMLAttr) {
		super(astToken);

		this.spacesBeforeName = new MLDOMToken(this._astToken.spacesBeforeName);
		this.name = new MLDOMToken(this._astToken.name);
		this.spacesBeforeEqual = new MLDOMToken(this._astToken.spacesBeforeEqual);
		this.equal = new MLDOMToken(this._astToken.equal);
		this.spacesAfterEqual = new MLDOMToken(this._astToken.spacesAfterEqual);
		this.startQuote = new MLDOMToken(this._astToken.startQuote);
		this.value = new MLDOMToken(this._astToken.value);
		this.endQuote = new MLDOMToken(this._astToken.endQuote);
		this.isDynamicValue = astToken.isDynamicValue;
		this.isDirective = astToken.isDirective;
		this.potentialName = astToken.potentialName || this.name.raw.toLowerCase();
	}

	get raw() {
		const raw = [this.name.raw];
		if (this.equal.raw === '=') {
			raw.push(this.spacesBeforeEqual.raw);
			raw.push(this.equal.raw);
			raw.push(this.spacesAfterEqual.raw);
			raw.push(this.startQuote.raw);
			raw.push(this.value.raw);
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
			line: this.value.startLine,
			col: this.value.startCol,
			potential: this.value.raw,
			raw: this.value.raw,
		};
	}

	toString(withSpace = true) {
		return (withSpace ? this.spacesBeforeName.raw : '') + this.raw;
	}
}
