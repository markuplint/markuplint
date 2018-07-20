import { MLASTAttr } from '@markuplint/ml-ast/';
import Token from './token';

export default class Attribute extends Token<MLASTAttr> {}

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
