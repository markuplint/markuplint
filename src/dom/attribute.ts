import { Indentation } from './';
import Token from './token';

const reAttrsInStartTag = /(\s*)([^\x00-\x1f\x7f-\x9f "'>\/=]+)(?:(\s*=\s*)(?:(?:"([^"]*)")|(?:'([^']*)')|([^\s]*)))?/;

import {
	getCol,
	getLine,
	getOffset,
} from '../parser/location';

export default class Attribute extends Token {
	public readonly name: Token;
	public readonly value: Token | null;
	public readonly quote: '"' | "'" | null;
	public readonly equal: Token | null;
	public readonly invalid: boolean;

	constructor (raw: string, line: number, col: number, startOffset: number) {
		super(raw, line, col, startOffset);

		const attrMatchedMap = raw.match(reAttrsInStartTag);

		if (!attrMatchedMap) {
			throw new SyntaxError('Illegal attribute token');
		}

		const beforeSpaces = attrMatchedMap[1];
		const name = attrMatchedMap[2];
		const equal = attrMatchedMap[3] || null;
		const quote = attrMatchedMap[4] != null ? '"' : attrMatchedMap[5] != null ? "'" : null;
		const value = attrMatchedMap[4] || attrMatchedMap[5] || attrMatchedMap[6] || null;
		const index = attrMatchedMap.index!; // no global matches
		const invalid = !!(value && quote === null && /["'=<>`]/.test(value)) || !!(equal && quote === null && value === null);

		// col += index;

		// if (/\r?\n/.test(raw)) {
		// 	const lineSplited = raw.split(/\r?\n/g);
		// 	line += lineSplited.length - 1;
		// 	const lastLine = lineSplited.slice(-1)[0];
		// 	col = lastLine.indexOf(name);
		// }

		// Debug Log
		// console.log(`${'_'.repeat(col)}${raw}`);
		// console.log({ name, equal, quote, value, col, line });
		// console.log({ raw: raw.replace(/\r?\n/g, '⏎').replace(/\t/g, '→'), col, line });
		// console.log('\n\n');
		let shavedString = raw;
		let offset = startOffset;

		this.name = tokenize(name, shavedString, line, col, offset);
		line = this.name.line;
		col = this.name.col;
		offset = this.name.location.startOffset;
		shavedString = shavedString.substr(0, offset);

		this.value = tokenize(value, shavedString, line, col, offset);
		if (this.value) {
			line = this.value.line;
			col = this.value.col;
			offset = this.value.location.startOffset;
			shavedString = shavedString.substr(0, offset);
		}

		this.equal = tokenize(equal, shavedString, line, col, offset);
		if (this.equal) {
			line = this.equal.line;
			col = this.equal.col;
			offset = this.equal.location.startOffset;
			shavedString = shavedString.substr(0, offset);
		}

		this.quote = quote;
		this.invalid = invalid;

		console.log(this);
	}

	public toJSON () {
		return {
			name: this.name.toJSON(),
			value: this.value ? this.value.toJSON() : null,
			quote: this.quote,
			equal: this.equal ? this.equal.toJSON() : null,
			invalid: this.invalid,
			raw: this.raw,
			beforeSpaces: this.beforeSpaces.toJSON(),
			line: this.line,
			col: this.col,
			endLine: this.location.endLine,
			endCol: this.location.endCol,
			startOffset: this.location.startOffset,
			endOffset: this.location.endOffset,
		};
	}
}

/**
 *  TODO: move to `Token.create()`
 */
function tokenize (token: string, raw: string, line: number, col: number, offset: number): Token;
function tokenize (token: null, raw: string, line: number, col: number, offset: number): null;
function tokenize (token: string | null, raw: string, line: number, col: number, offset: number): Token | null;
function tokenize (token: string | null, raw: string, line: number, col: number, offset: number): Token | null {
	if (!token) {
		return null;
	}
	const l = getLine(token, raw, line);
	const c = getCol(token, raw, col);
	const o = getOffset(token, raw, offset);
	const before = raw.substr(0, o);
	console.log({raw, token, l, c, o, before});
	return new Token(token, l, c, o, before);
}
