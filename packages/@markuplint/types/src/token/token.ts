import type { TokenValue } from './types.js';
import type { UnmatchedResult, UnmatchedResultOptions, UnmatchedResultReason } from '../types.js';

export class Token {
	/**
	 * @see https://github.com/csstree/csstree/blob/master/lib/tokenizer/types.js
	 */
	static readonly Comma = 18;
	static readonly Ident = 1;
	static readonly WhiteSpace = 13;

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
	 * @deprecated Use {@link getPosition} instead. Will be removed in v5.0.0.
	 */
	static getCol(value: string, offset: number) {
		const lines = value.slice(0, offset).split(/\n/);
		return (lines.at(-1) ?? '').length + 1;
	}

	/**
	 * @deprecated Use {@link getPosition} instead. Will be removed in v5.0.0.
	 */
	static getLine(value: string, offset: number) {
		return value.slice(0, offset).split(/\n/).length;
	}

	static getPosition(value: string, offset: number) {
		const lines = value.slice(0, offset).split(/\n/);
		const line = lines.length;
		const column = (lines.at(-1) ?? '').length + 1;
		return { line, column };
	}

	static getType(value: string, separators?: readonly string[]) {
		if (Token.whitespace.includes(value[0] ?? '')) {
			return Token.WhiteSpace;
		}
		if (separators?.includes(value[0] ?? '')) {
			switch (value[0]) {
				case ',': {
					return Token.Comma;
				}
			}
		}
		return Token.Ident;
	}

	static shiftLocation(token: Readonly<Token>, offset: number) {
		const shifted = token.offset + offset;
		const { line, column } = Token.getPosition(token.originalValue, shifted);
		return {
			offset: shifted,
			line,
			column,
		};
	}

	readonly offset: number;
	readonly originalValue: string;
	readonly type: number;
	readonly value: string;

	constructor(value: string, offset: number, originalValue: string, separators?: readonly string[]) {
		this.type = Token.getType(value, separators);
		this.value = value;
		this.offset = offset;
		this.originalValue = originalValue;
	}

	get length() {
		return this.value.length;
	}

	clone() {
		return new Token(this.value, this.offset, this.originalValue);
	}

	/**
	 *
	 * @param value The token value or the token type or its list
	 */
	includes(value: TokenValue, caseInsensitive?: boolean): boolean {
		if (Array.isArray(value)) {
			return value.some(v => this.includes(v));
		}
		if (typeof value === 'string') {
			const a = caseInsensitive ? this.value.toLowerCase() : this.value;
			const b = caseInsensitive ? value.toLowerCase() : value;
			return a.includes(b);
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
	matches(value: TokenValue, caseInsensitive?: boolean): boolean {
		if (Array.isArray(value)) {
			return value.some(v => this.matches(v));
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

	toJSON() {
		return {
			type: this.type,
			value: this.value,
			offset: this.offset,
		};
	}

	toNumber() {
		const num = Number.parseFloat(this.value);
		return Number.isNaN(num) ? 0 : num;
	}

	unmatched(
		options?: UnmatchedResultOptions & {
			readonly ref?: string;
			readonly reason?: UnmatchedResultReason;
		},
	): UnmatchedResult {
		const { line, column } = Token.getPosition(this.originalValue, this.offset);
		return {
			...options,
			matched: false,
			ref: options?.ref ?? null,
			raw: this.value,
			offset: this.offset,
			length: this.value.length,
			line,
			column,
			reason: options?.reason ?? 'syntax-error',
		};
	}
}
