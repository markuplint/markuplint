import { MLASTAttr, MLToken } from '@markuplint/ml-ast';
import MLDOMToken from './token';

export default class MLDOMAttribute extends MLDOMToken<MLASTAttr> {
	readonly name: MLDOMToken<MLToken>;
	readonly spacesBeforeName: MLDOMToken<MLToken>;
	readonly spacesBeforeEqual: MLDOMToken<MLToken>;
	readonly equal: MLDOMToken<MLToken>;
	readonly spacesAfterEqual: MLDOMToken<MLToken>;
	readonly startQuote: MLDOMToken<MLToken>;
	readonly value: MLDOMToken<MLToken>;
	readonly endQuote: MLDOMToken<MLToken>;

	constructor(astToken: MLASTAttr) {
		super(astToken);

		this.spacesBeforeName = new MLDOMToken(this._astToken.spacesBeforeName);
		this.name = new MLDOMToken(this._astToken.name);
		this.spacesBeforeEqual = new MLDOMToken(this._astToken.spacesBeforeEqual);
		this.equal = new MLDOMToken(this._astToken.equal);
		this.spacesAfterEqual = new MLDOMToken(this._astToken.spacesAfterEqual);
		this.startQuote = new MLDOMToken(this._astToken.startQuote);
		this.value = new MLDOMToken(this._astToken.value);
		this.endQuote = new MLDOMToken(this._astToken.endQuote);
	}

	get raw() {
		const raw = [this.spacesBeforeName.raw];
		raw.push(this.name.raw);
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
}
