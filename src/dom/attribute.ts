import Token from './token';

import {
	reAttrsInStartTag,
	reStartTag,
	reTagName,
} from '../parser/const';

export default class Attribute extends Token {
	public readonly name: Token;
	public readonly value: Token | null;
	public readonly quote: '"' | "'" | null;
	public readonly equal: Token | null;
	public readonly invalid: boolean;

	constructor (attrString: string, line: number, col: number, startOffset: number) {
		super(attrString, line, col, startOffset);

		const attrMatchedMap = attrString.match(reAttrsInStartTag)!;
		const raw = attrMatchedMap[0];
		const name = attrMatchedMap[1];
		const equal = attrMatchedMap[2] || null;
		const quote = attrMatchedMap[3] != null ? '"' : attrMatchedMap[4] != null ? "'" : null;
		const value = attrMatchedMap[3] || attrMatchedMap[4] || attrMatchedMap[5] || null;
		const index = attrMatchedMap.index!; // no global matches
		const invalid = !!(value && quote === null && /["'=<>`]/.test(value)) || !!(equal && quote === null && value === null);
		col += index;

		if (/\r?\n/.test(attrString)) {
			const lineSplited = attrString.split(/\r?\n/g);
			line += lineSplited.length - 1;
			const lastLine = lineSplited.slice(-1)[0];
			col = lastLine.indexOf(name);
		}

		// Debug Log
		console.log(`${'_'.repeat(col)}${raw}`);
		console.log({ name, equal, quote, value, col, line });
		console.log({ attrString: attrString.replace(/\r?\n/g, '⏎').replace(/\t/g, '→'), col, line });
		console.log('\n\n');

		// @ts-ignore
		this.name = new Token(name);

		// @ts-ignore
		this.value = value ? new Token(value) : null;

		// @ts-ignore
		this.equal = equal ? new Token(equal) : null;

		this.quote = quote;
		this.invalid = invalid;
	}

	public toJSON () {
		return {
			name: this.name.raw,
			value: this.value ? this.value.raw : null,
			quote: this.quote,
			col: this.col,
			line: this.line,
			equal: this.equal ? this.equal.raw : null,
			raw: this.raw,
			invalid: this.invalid,
		};
	}
}
