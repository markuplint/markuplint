import { MLASTAttr, MLToken } from '@markuplint/ml-ast/';
import Token from './token';

export default class Attribute extends Token<MLASTAttr> {
	public readonly name: Token<MLToken>;
	public readonly spacesBeforeEqual: Token<MLToken> | null;
	public readonly equal: Token<MLToken> | null;
	public readonly spacesAfterEqual: Token<MLToken> | null;
	public readonly tokenBeforeValue: Token<MLToken> | null;
	public readonly value: Token<MLToken> | null;
	constructor(astToken: MLASTAttr) {
		super(astToken);

		this.name = new Token(this._astToken.name);
		this.spacesBeforeEqual = this._astToken.spacesBeforeEqual ? new Token(this._astToken.spacesBeforeEqual) : null;
		this.equal = this._astToken.equal ? new Token(this._astToken.equal) : null;
		this.spacesAfterEqual = this._astToken.spacesAfterEqual ? new Token(this._astToken.spacesAfterEqual) : null;
		this.tokenBeforeValue = this._astToken.tokenBeforeValue ? new Token(this._astToken.tokenBeforeValue) : null;
		this.value = this._astToken.value ? new Token(this._astToken.value) : null;
	}
}

// export default class AttributeValue extends Token {
// 	private _value: string;
// 	private _quote: '"' | "'" | null;

// 	constructor(
// 		value: string,
// 		quote: '"' | "'" | null,
// 		line: number,
// 		col: number,
// 		startOffset: number,
// 	) {
// 		const quoteStr = quote || '';
// 		super(`${quoteStr}${value}${quoteStr}`, line, col, startOffset);
// 		this._value = value;
// 		this._quote = quote;
// 	}

// 	public get value() {
// 		return this._value;
// 	}

// 	public get quote() {
// 		return this._quote;
// 	}

// 	public get raw() {
// 		const raw: string[] = [];
// 		if (this._quote) {
// 			raw.push(this._quote);
// 		}
// 		if (this._value) {
// 			raw.push(this._value);
// 		}
// 		if (this._quote) {
// 			raw.push(this._quote);
// 		}
// 		return raw.join('');
// 	}

// 	public fix(fixedValue: string | null, fixedQuote?: '"' | "'" | null) {
// 		if (fixedValue != null) {
// 			this._value = fixedValue;
// 		}
// 		if (fixedQuote !== undefined) {
// 			this._quote = fixedQuote;
// 		}
// 	}

// 	public toJSON() {
// 		return {
// 			raw: this.raw,
// 			line: this.line,
// 			col: this.col,
// 			endLine: this.location.endLine,
// 			endCol: this.location.endCol,
// 			startOffset: this.location.startOffset,
// 			endOffset: this.location.endOffset,
// 			value: this.value,
// 			quote: this.quote,
// 		};
// 	}
// }
