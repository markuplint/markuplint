import Token from './token';

export default class AttributeValue extends Token {
	public readonly value: string;
	public readonly quote: '"' | "'" | null;

	constructor (value: string, quote: '"' | "'" | null, line: number, col: number, startOffset: number) {
		const quoteStr = quote || '';
		super(`${quoteStr}${value}${quoteStr}`, line, col, startOffset);
		this.value = value;
		this.quote = quote;
	}

	public toJSON () {
		return {
			raw: this.raw,
			line: this.line,
			col: this.col,
			endLine: this.location.endLine,
			endCol: this.location.endCol,
			startOffset: this.location.startOffset,
			endOffset: this.location.endOffset,
			value: this.value,
			quote: this.quote,
		};
	}
}
