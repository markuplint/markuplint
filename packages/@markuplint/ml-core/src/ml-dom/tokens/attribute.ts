import { MLASTAttr, MLToken } from '@markuplint/ml-ast';
import MLDOMToken from './token';

export default class MLDOMAttribute extends MLDOMToken<MLASTAttr> {
	public readonly name: MLDOMToken<MLToken>;
	public readonly spacesBeforeName: MLDOMToken<MLToken>;
	public readonly spacesBeforeEqual: MLDOMToken<MLToken>;
	public readonly equal: MLDOMToken<MLToken>;
	public readonly spacesAfterEqual: MLDOMToken<MLToken>;
	public readonly startQuote: MLDOMToken<MLToken>;
	public readonly value: MLDOMToken<MLToken>;
	public readonly endQuote: MLDOMToken<MLToken>;
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

	public get raw() {
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
