import type { UnmatchedResult } from '..';
import type { Expect, Result, List } from '../types';

import { matched, unmatched } from '../match-result';

import { Token } from './token';

type TokenCollectionOptions = Partial<
	Omit<List, 'token'> & {
		speificSeparator: string | string[];
	}
>;

export type TokenEachCheck = (head: Token | null, tail: TokenCollection) => Result | void;

export class TokenCollection extends Array<Token> {
	private static _new(tokens: Token[], old?: TokenCollection) {
		const newCollection = new TokenCollection('', old);
		newCollection.push(...tokens);
		return newCollection;
	}

	static fromPatterns(
		value: Token | string,
		patterns: RegExp[],
		typeOptions?: Omit<TokenCollectionOptions, 'speificSeparator'> & { repeat?: boolean },
	) {
		const origin = typeof value === 'string' ? value : value.origin;
		let strings = typeof value === 'string' ? value : value.value;
		let cumulativeOffset = typeof value === 'string' ? 0 : value.offset;
		const tokens: Token[] = [];

		function addToken(tokenValue: string) {
			const token = new Token(tokenValue, cumulativeOffset, origin);
			tokens.push(token);

			strings = strings.slice(tokenValue.length);
			cumulativeOffset += tokenValue.length;

			return token;
		}

		let isBreaked = false;
		do {
			isBreaked = false;
			for (const pattern of patterns) {
				const res = pattern.exec(strings);
				let value: string;

				if (!res) {
					isBreaked = true;
					value = '';
				} else {
					if (res.index !== 0) {
						value = strings.slice(res.index + res[0].length);
					} else {
						value = res[0] || '';
					}
				}

				const token = addToken(value);

				// @ts-ignore
				token._ = pattern;
			}
			if (isBreaked) {
				addToken(strings);
			}
		} while (typeOptions?.repeat && strings);

		if (strings) {
			addToken(strings);
		}

		return TokenCollection._new(tokens, new TokenCollection('', typeOptions));
	}

	static get [Symbol.species]() {
		return Array;
	}

	readonly disallowToSurroundBySpaces: NonNullable<List['disallowToSurroundBySpaces']>;
	readonly allowEmpty: NonNullable<List['allowEmpty']>;
	readonly ordered: NonNullable<List['ordered']>;
	readonly unique: NonNullable<List['unique']>;
	readonly caseInsensitive: NonNullable<List['caseInsensitive']>;
	readonly number: List['number'];
	readonly separator: NonNullable<List['separator']>;

	constructor(value?: string, typeOptions?: TokenCollectionOptions);
	constructor(value?: number); // for map method etc.
	constructor(value?: string | number, typeOptions?: TokenCollectionOptions) {
		super();

		this.disallowToSurroundBySpaces = typeOptions?.disallowToSurroundBySpaces || false;
		this.allowEmpty = typeOptions?.allowEmpty || true;
		this.ordered = typeOptions?.ordered || false;
		this.unique = typeOptions?.unique || false;
		this.caseInsensitive = typeOptions?.caseInsensitive || true;
		this.number = typeOptions?.number;
		this.separator = typeOptions?.separator || 'space';

		if (typeof value === 'number') {
			this.length = value;
			return;
		}

		if (!value) {
			return;
		}

		const separators: string[] = [];
		if (this.separator === 'comma') {
			separators.push(',');
		}

		if (typeOptions?.speificSeparator) {
			if (Array.isArray(typeOptions.speificSeparator)) {
				separators.push(...typeOptions.speificSeparator);
			} else {
				separators.push(typeOptions.speificSeparator);
			}
		}

		const chars = value.split('');
		const values: string[] = [];
		let char: string | undefined;
		while ((char = chars.shift())) {
			const last = values.pop();
			if (!last) {
				values.push(char);
				continue;
			}
			const lastChar = last[0];
			if (
				!separators.includes(char) &&
				!separators.includes(last[0]) &&
				((Token.whitespace.includes(lastChar) && Token.whitespace.includes(char)) ||
					(!Token.whitespace.includes(lastChar) && !Token.whitespace.includes(char)))
			) {
				values.push(last + char);
			} else {
				values.push(last);
				values.push(char);
			}
		}

		let offset = 0;
		values.forEach(v => {
			const token = new Token(v, offset, value, separators);
			this.push(token);
			offset += v.length;
		});
	}

	get value() {
		const value = this.map(t => t.value).join('');
		return value;
	}

	filter(callback: (value: Token, index: number, array: Token[]) => boolean) {
		return TokenCollection._new(super.filter(callback), this);
	}

	headAndTail(): { head: Token | null; tail: TokenCollection } {
		const copy = this.slice();
		const head = copy.shift();
		if (!head) {
			return { head: head || null, tail: TokenCollection._new([], this) };
		}
		const tail = TokenCollection._new(copy, this);
		return { head, tail };
	}

	getIdentTokens() {
		return this.filter(token => token.type === Token.Ident);
	}

	compareTokens(callback: (prev: Token, current: Token) => Token | null | void) {
		const _tokens = this.slice();
		let prev = _tokens.shift();
		while (prev) {
			const current = _tokens.shift();
			if (!current) {
				return;
			}
			const result = callback(prev, current);
			if (result) {
				return result;
			}
			prev = current;
		}
		return null;
	}

	/**
	 *
	 * @param value The token value or the token type or its list
	 */
	has(value: string | RegExp | number | (string | RegExp | number)[]) {
		return this.some(t => t.match(value));
	}

	/**
	 *
	 * @param value The token value or the token type or its list
	 */
	search(value: string | RegExp | number | (string | RegExp | number)[]) {
		for (const token of this) {
			if (token.includes(value)) {
				return token;
			}
		}
		return null;
	}

	check(options: { expects?: Expect[]; ref?: string; cache?: boolean } = {}) {
		const { expects, ref } = options;

		if (this.disallowToSurroundBySpaces) {
			for (const token of this) {
				if (token.type === 13) {
					return token.unmatched({
						reason: 'unexpected-space',
						ref,
						expects,
					});
				}
			}
		}

		if (this.separator === 'comma') {
			const tokensWithoutWP = this.filter(token => token.type !== Token.WhiteSpace);
			const consecutiveComma = tokensWithoutWP.getConsecutiveToken(Token.Comma);
			if (consecutiveComma) {
				return consecutiveComma.unmatched({
					reason: 'unexpected-comma',
					ref,
					expects,
				});
			}

			if (tokensWithoutWP[0] && tokensWithoutWP[0].type === Token.Comma) {
				return tokensWithoutWP[0].unmatched({
					reason: 'unexpected-comma',
					ref,
					expects,
				});
			}

			const takeTurnsError = tokensWithoutWP.takeTurns([Token.Ident, Token.Comma], Token.Ident);
			if (takeTurnsError) {
				if (takeTurnsError.unexpectedLastToken) {
					return takeTurnsError.token.unmatched({
						reason: 'extra-token',
						ref,
						expects,
					});
				} else if (takeTurnsError.token.type === takeTurnsError.expectedTokenNumber) {
					// Consecutive cammas
					return takeTurnsError.token.unmatched({
						reason: 'unexpected-comma',
						ref,
						expects,
					});
				}
				return takeTurnsError.token.unmatched({
					reason: 'missing-comma',
					ref,
					expects,
					candicate: `,${takeTurnsError.token.value}`,
				});
			}
		}

		const identTokens = this.getIdentTokens();

		const allowEmpty = this.allowEmpty ?? true;
		if (!allowEmpty && identTokens.length === 0) {
			return unmatched(this.value, 'empty-token', {
				ref,
				expects,
			});
		}

		if (this.unique) {
			const duplicated = identTokens.getDuplicated();
			if (duplicated) {
				return duplicated.unmatched({
					partName: 'the content of the list',
					reason: 'duplicated',
					ref,
					expects,
				});
			}
		}

		return matched();
	}

	getConsecutiveToken(tokenType: number) {
		const resultToken = this.compareTokens((prev, current) => {
			if (prev.type === tokenType && current.type === tokenType) {
				return current;
			}
		});
		return resultToken || null;
	}

	takeTurns(tokenNumbers: ReadonlyArray<number>, lastTokenNumber?: number) {
		const tokens = this.slice();
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			const expectedTokenNumber = tokenNumbers[i % tokenNumbers.length];
			if (token.type !== expectedTokenNumber) {
				return {
					unexpectedLastToken: false,
					expectedTokenNumber,
					token,
				};
			}
			if (lastTokenNumber != null && i === tokens.length - 1 && token.type !== lastTokenNumber) {
				return {
					unexpectedLastToken: true,
					expectedTokenNumber,
					token,
				};
			}
		}
		return null;
	}

	eachCheck(...callbacks: TokenEachCheck[]): Result {
		let headAndTail = this.headAndTail();
		let head = headAndTail.head;
		let tail = headAndTail.tail;
		let prev: Token | null = null;
		let cumulativeOffset = 0;
		let passCount = 0;
		let firstUnmatched: UnmatchedResult | null = null;
		let wait = 20;
		for (const callback of callbacks) {
			wait--;
			const result = callback.call(this, head, tail);
			if (result && !result.matched) {
				passCount += result.passCount || 0;
				if (prev && result.offset === 0 && result.length === 0) {
					const { offset, line, column } = Token.shiftLocation(prev, cumulativeOffset);
					firstUnmatched = firstUnmatched || {
						...result,
						offset,
						line,
						column,
					};
				}
				if (!prev && this.value.length === 0) {
					firstUnmatched = firstUnmatched || {
						...result,
						reason: 'empty-token',
						expects: undefined,
					};
				}
				switch (result.reason) {
					case 'extra-token': {
						passCount += 1;
						break;
					}
					default: {
						if (typeof result.reason !== 'string') {
							passCount += 2 * wait;
						}
					}
				}
				firstUnmatched = firstUnmatched || result;
			} else if (result && !firstUnmatched && result.matched) {
				return result;
			} else {
				if (head?.value && !head.match(/^\s*$/)) {
					passCount += 4 * wait;
				}
			}
			cumulativeOffset = head?.length || 0;
			headAndTail = tail.headAndTail();
			prev = head;
			head = headAndTail.head;
			tail = headAndTail.tail;
		}

		if (firstUnmatched) {
			const res = {
				...firstUnmatched,
				passCount,
			};
			return res;
		}

		return matched();
	}

	getDuplicated() {
		const aList = this.slice();
		const bList = this.slice();
		for (const aToken of aList) {
			for (const bToken of bList) {
				if (aToken.offset === bToken.offset) {
					continue;
				}
				let a = aToken.value;
				let b = bToken.value;
				if (this.caseInsensitive) {
					a = a.toLowerCase();
					b = b.toLowerCase();
				}
				if (a === b) {
					return bToken;
				}
			}
		}
		return null;
	}

	divide(position: number) {
		const _a = this.slice(0, position);
		const _b = this.slice(position);
		const a = TokenCollection._new(_a, this);
		const b = TokenCollection._new(_b, this);
		return [a, b] as const;
	}

	chunk(split: number) {
		const chunks: TokenCollection[] = [];
		const tokens = this.slice();
		while (tokens.length) {
			const chunkTokens = tokens.splice(0, split);
			const chunk = TokenCollection._new(chunkTokens, this);
			chunks.push(chunk);
		}
		return chunks;
	}

	toJSON() {
		return this.map(t => t.toJSON());
	}
}
