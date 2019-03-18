import { MLASTAttr, MLToken } from '@markuplint/ml-ast';
import MLDOMToken from './token';

export default class MLDOMAttribute extends MLDOMToken<MLASTAttr> {
	public readonly name: MLDOMToken<MLToken>;
	public readonly beforeSpaces: MLDOMToken<MLToken>;
	public readonly spacesBeforeEqual: MLDOMToken<MLToken> | null;
	public readonly equal: MLDOMToken<MLToken> | null;
	public readonly spacesAfterEqual: MLDOMToken<MLToken> | null;
	public readonly tokenBeforeValue: MLDOMToken<MLToken> | null;
	public readonly value: MLDOMToken<MLToken> | null;
	constructor(astToken: MLASTAttr) {
		super(astToken);

		this.name = new MLDOMToken(this._astToken.name);
		this.beforeSpaces = new MLDOMToken(this._astToken.beforeSpaces);
		this.spacesBeforeEqual = this._astToken.spacesBeforeEqual
			? new MLDOMToken(this._astToken.spacesBeforeEqual)
			: null;
		this.equal = this._astToken.equal ? new MLDOMToken(this._astToken.equal) : null;
		this.spacesAfterEqual = this._astToken.spacesAfterEqual
			? new MLDOMToken(this._astToken.spacesAfterEqual)
			: null;
		this.tokenBeforeValue = this._astToken.tokenBeforeValue
			? new MLDOMToken(this._astToken.tokenBeforeValue)
			: null;
		this.value = this._astToken.value ? new MLDOMToken(this._astToken.value) : null;
	}
}
