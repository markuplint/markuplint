import type { UnmatchedResult, UnmatchedResultOptions, UnmatchedResultReason } from '../types';

export class Token {
	static getType(value: string, separators?: string[]) {
		if (Token.whitespace.includes(value[0])) {
			return Token.WhiteSpace;
		}
		if (separators?.includes(value[0])) {
			switch (value[0]) {
				case ',':
					return Token.Comma;
			}
		}
		return Token.Ident;
	}

	static getLine(value: string, offset: number) {
		return value.slice(0, offset).split(/\n/g).length;
	}

	static getCol(value: string, offset: number) {
		const lines = value.slice(0, offset).split(/\n/g);
		return lines[lines.length - 1].length + 1;
	}

	static shiftLocation(token: Token, offset: number) {
		const shifted = token.offset + offset;
		return {
			offset: shifted,
			line: Token.getLine(token.#originalValue, shifted),
			column: Token.getCol(token.#originalValue, shifted),
		};
	}

	/**
	 * ASCII whitespace is
	 * - U+0009 TAB
	 * - U+000A LF
	 * - U+000C FF
	 * - U+000D CR
	 * - U+0020 SPACE.
	 *
	 * @see https://infra.spec.whatwg.org/#ascii-whitespace
	 */
	static readonly whitespace: ReadonlyArray<string> = ['\u0009', '\u000A', '\u000C', '\u000D', '\u0020'];

	/**
	 * @see https://github.com/csstree/csstree/blob/master/lib/tokenizer/types.js
	 */
	static readonly Ident = 1;
	static readonly WhiteSpace = 13;
	static readonly Comma = 18;

	readonly type: number;
	readonly value: string;
	readonly offset: number;
	#originalValue: string;

	constructor(value: string, offset: number, originalValue: string, separators?: string[]) {
		this.type = Token.getType(value, separators);
		this.value = value;
		this.offset = offset;
		this.#originalValue = originalValue;
	}

	get length() {
		return this.value.length;
	}

	get origin() {
		return this.#originalValue;
	}

	unmatched(
		options?: UnmatchedResultOptions & {
			ref?: string;
			reason?: UnmatchedResultReason;
		},
	): UnmatchedResult {
		return {
			...options,
			matched: false,
			ref: options?.ref || null,
			raw: this.value,
			offset: this.offset,
			length: this.value.length,
			line: Token.getLine(this.#originalValue, this.offset),
			column: Token.getCol(this.#originalValue, this.offset),
			reason: options?.reason ?? 'syntax-error',
		};
	}

	/**
	 *
	 * @param value The token value or the token type or its list
	 */
	match(value: string | RegExp | number | (string | RegExp | number)[], caseInsensitive?: boolean): boolean {
		if (Array.isArray(value)) {
			return value.some(v => this.match(v));
		}
		if (typeof value === 'string') {
			const a = caseInsensitive ? this.value.toLowerCase() : this.value;
			const b = caseInsensitive ? value.toLowerCase() : value;
			return a === b;
		}
		if (value instanceof RegExp) {
			const pattern = new RegExp(value, caseInsensitive ? 'i' : '');
			return pattern.test(this.value);
		}
		return this.type === value;
	}

	/**
	 *
	 * @param value The token value or the token type or its list
	 */
	includes(value: string | RegExp | number | (string | RegExp | number)[], caseInsensitive?: boolean): boolean {
		if (Array.isArray(value)) {
			return value.some(v => this.includes(v));
		}
		if (typeof value === 'string') {
			const a = caseInsensitive ? this.value.toLowerCase() : this.value;
			const b = caseInsensitive ? value.toLowerCase() : value;
			return a.indexOf(b) !== -1;
		}
		if (value instanceof RegExp) {
			const pattern = new RegExp(value, caseInsensitive ? 'i' : '');
			return pattern.test(this.value);
		}
		return this.type === value;
	}

	toNumber() {
		return parseFloat(this.value);
	}

	toJSON() {
		return {
			type: this.type,
			value: this.value,
			offset: this.offset,
		};
	}
}
