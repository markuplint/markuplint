import { MLASTAttr, MLToken } from '@markuplint/ml-ast';
import Token from './token';

export default class Attribute extends Token<MLASTAttr> {
	public readonly name: Token<MLToken>;
	public readonly beforeSpaces: Token<MLToken>;
	public readonly spacesBeforeEqual: Token<MLToken> | null;
	public readonly equal: Token<MLToken> | null;
	public readonly spacesAfterEqual: Token<MLToken> | null;
	public readonly tokenBeforeValue: Token<MLToken> | null;
	public readonly value: Token<MLToken> | null;
	constructor(astToken: MLASTAttr) {
		super(astToken);

		this.name = new Token(this._astToken.name);
		this.beforeSpaces = new Token(this._astToken.beforeSpaces);
		this.spacesBeforeEqual = this._astToken.spacesBeforeEqual ? new Token(this._astToken.spacesBeforeEqual) : null;
		this.equal = this._astToken.equal ? new Token(this._astToken.equal) : null;
		this.spacesAfterEqual = this._astToken.spacesAfterEqual ? new Token(this._astToken.spacesAfterEqual) : null;
		this.tokenBeforeValue = this._astToken.tokenBeforeValue ? new Token(this._astToken.tokenBeforeValue) : null;
		this.value = this._astToken.value ? new Token(this._astToken.value) : null;
	}
}
