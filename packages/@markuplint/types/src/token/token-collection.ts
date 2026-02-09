import type { TokenValue } from './types.js';
import type { Expect, Result, List, UnmatchedResult } from '../types.js';

import { matched, unmatched } from '../match-result.js';

import { Token } from './token.js';

type TokenCollectionOptions = Partial<
	Omit<List, 'token'> & {
		specificSeparator: string | string[];
	}
>;

/**
 * Callback function for sequential token checking in {@link TokenCollection.eachCheck}.
 * Receives the current head token and remaining tail tokens.
 * Returns a result to stop iteration, or `void` to continue.
 */
export type TokenEachCheck = (
	head: Readonly<Token> | null,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	tail: TokenCollection,
) => Result | void;

/**
 * An ordered collection of tokens parsed from a string value.
 *
 * Extends `Array<Token>` with parsing, validation, and query capabilities.
 * Supports configurable separators (space, comma, or custom), uniqueness
 * constraints, ordering checks, and case sensitivity options.
 */
export class TokenCollection extends Array<Token> {
	/**
	 * Creates a TokenCollection by matching a value against a sequence of regex patterns.
	 *
	 * @param value - The source token or string to parse
	 * @param patterns - The regex patterns to match sequentially
	 * @param typeOptions - Optional collection configuration
	 * @returns A new TokenCollection containing the matched tokens
	 */
	static fromPatterns(
		value: Readonly<Token> | string,
		patterns: readonly Readonly<RegExp>[],
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		typeOptions?: Omit<TokenCollectionOptions, 'specificSeparator'> & { repeat?: boolean },
	) {
		const originalValue = typeof value === 'string' ? value : value.originalValue;
		let strings = typeof value === 'string' ? value : value.value;
		let cumulativeOffset = typeof value === 'string' ? 0 : value.offset;
		const tokens: Token[] = [];

		function addToken(tokenValue: string) {
			const token = new Token(tokenValue, cumulativeOffset, originalValue);
			tokens.push(token);

			strings = strings.slice(tokenValue.length);
			cumulativeOffset += tokenValue.length;

			return token;
		}

		let isBroken: boolean;
		do {
			isBroken = false;
			for (const pattern of patterns) {
				const res = pattern.exec(strings);
				let value: string;

				if (res) {
					if (res.index === 0) {
						value = res[0] ?? '';
					} else {
						value = strings.slice(res.index + res[0].length);
					}
				} else {
					isBroken = true;
					value = '';
				}

				const token = addToken(value);

				// @ts-ignore
				token._ = pattern;
			}
			if (isBroken) {
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

	readonly allowEmpty: NonNullable<List['allowEmpty']>;
	readonly caseInsensitive: NonNullable<List['caseInsensitive']>;
	readonly disallowToSurroundBySpaces: NonNullable<List['disallowToSurroundBySpaces']>;
	readonly number: List['number'];
	readonly ordered: NonNullable<List['ordered']>;
	readonly separator: NonNullable<List['separator']>;
	readonly unique: NonNullable<List['unique']>;

	constructor(
		value?: string,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		typeOptions?: TokenCollectionOptions,
	);

	constructor(value?: number); // for map method etc.
	constructor(
		value?: string | number,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		typeOptions?: TokenCollectionOptions,
	) {
		super();

		this.disallowToSurroundBySpaces = typeOptions?.disallowToSurroundBySpaces ?? false;
		this.allowEmpty = typeOptions?.allowEmpty ?? true;
		this.ordered = typeOptions?.ordered ?? false;
		this.unique = typeOptions?.unique ?? false;
		this.caseInsensitive = typeOptions?.caseInsensitive ?? true;
		this.number = typeOptions?.number;
		this.separator = typeOptions?.separator ?? 'space';

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

		if (typeOptions?.specificSeparator != null) {
			if (typeof typeOptions.specificSeparator === 'string') {
				separators.push(typeOptions.specificSeparator);
			} else {
				separators.push(...typeOptions.specificSeparator);
			}
		}

		const chars = [...value];
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
				lastChar &&
				!separators.includes(char) &&
				!separators.includes(lastChar) &&
				((Token.whitespace.includes(lastChar) && Token.whitespace.includes(char)) ||
					(!Token.whitespace.includes(lastChar) && !Token.whitespace.includes(char)))
			) {
				values.push(last + char);
			} else {
				values.push(last, char);
			}
		}

		let offset = 0;
		for (const v of values) {
			const token = new Token(v, offset, value, separators);
			this.push(token);
			offset += v.length;
		}
	}

	/**
	 * The concatenated string value of all tokens in this collection.
	 */
	get value() {
		const value = this.map(t => t.value).join('');
		return value;
	}

	/**
	 * Validates the token collection structure against its configuration.
	 *
	 * Checks for unexpected spaces, consecutive commas, empty tokens,
	 * and duplicate values based on the collection's separator, allowEmpty,
	 * and unique settings.
	 *
	 * @param options - Optional validation settings including expected values and reference URL
	 * @returns The validation result
	 */
	check(options: { expects?: Expect[]; ref?: string; cache?: boolean } = {}) {
		const { expects, ref } = options;

		if (this.separator !== 'space' && this.disallowToSurroundBySpaces) {
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
					// Consecutive commas
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
					candidate: `,${takeTurnsError.token.value}`,
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

	/**
	 * Splits this collection into chunks of the specified size.
	 *
	 * @param split - The number of tokens per chunk
	 * @returns An array of TokenCollection chunks
	 */
	chunk(split: number) {
		const chunks: TokenCollection[] = [];
		const tokens = this.slice();
		while (tokens.length > 0) {
			const chunkTokens = tokens.splice(0, split);
			const chunk = TokenCollection._new(chunkTokens, this);
			chunks.push(chunk);
		}
		return chunks;
	}

	/**
	 * Iterates over consecutive token pairs, calling the callback for each pair.
	 *
	 * @param callback - A function receiving the previous and current token; return a token to stop iteration
	 * @returns The token returned by the callback, or `null` if iteration completes
	 */
	compareTokens(callback: (prev: Readonly<Token>, current: Readonly<Token>) => Readonly<Token> | null | void) {
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
	 * Splits this collection into two at the given position.
	 *
	 * @param position - The index at which to split
	 * @returns A tuple of two TokenCollections: before and after the position
	 */
	divide(position: number) {
		const _a = this.slice(0, position);
		const _b = this.slice(position);
		const a = TokenCollection._new(_a, this);
		const b = TokenCollection._new(_b, this);
		return [a, b] as const;
	}

	/**
	 * Applies a sequence of check callbacks to consecutive tokens.
	 *
	 * Each callback receives the current head token and remaining tail.
	 * Tracks pass count and cumulative offset for error reporting.
	 *
	 * @param callbacks - The check functions to apply sequentially
	 * @returns The validation result
	 */
	eachCheck(...callbacks: readonly TokenEachCheck[]): Result {
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
				passCount += result.passCount ?? 0;
				if (prev && result.offset === 0 && result.length === 0) {
					const { offset, line, column } = Token.shiftLocation(prev, cumulativeOffset);
					firstUnmatched = firstUnmatched ?? {
						...result,
						offset,
						line,
						column,
					};
				}
				if (!prev && this.value.length === 0) {
					firstUnmatched = firstUnmatched ?? {
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
				firstUnmatched = firstUnmatched ?? result;
			} else if (result && !firstUnmatched && result.matched) {
				return result;
			} else {
				if (head?.value && !head.matches(/^\s*$/)) {
					passCount += 4 * wait;
				}
			}
			cumulativeOffset = head?.length ?? 0;
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

	/**
	 * Creates a new TokenCollection containing only tokens that pass the test.
	 *
	 * @param callback - The filter predicate function
	 * @returns A new TokenCollection with the filtered tokens
	 */
	filter(callback: Parameters<Array<Token>['filter']>[0]): TokenCollection {
		return TokenCollection._new(super.filter(callback), this);
	}

	/**
	 * Finds the first occurrence of two consecutive tokens of the same type.
	 *
	 * @param tokenType - The token type number to check for consecutive occurrences
	 * @returns The second consecutive token, or `null` if none found
	 */
	getConsecutiveToken(tokenType: number) {
		const resultToken = this.compareTokens((prev, current) => {
			if (prev.type === tokenType && current.type === tokenType) {
				return current;
			}
		});
		return resultToken ?? null;
	}

	/**
	 * Finds the first duplicated token in this collection.
	 *
	 * Comparison respects the `caseInsensitive` setting of this collection.
	 *
	 * @returns The duplicated token, or `null` if all tokens are unique
	 */
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

	/**
	 * Returns only the identifier tokens, excluding whitespace and separators.
	 *
	 * @returns A new TokenCollection containing only Ident-type tokens
	 */
	getIdentTokens() {
		return this.filter(token => token.type === Token.Ident);
	}

	/**
	 * Checks whether any token in this collection matches the given value.
	 *
	 * @param value - The token value, type number, regex, or array to check against
	 * @returns Whether any token matches
	 */
	has(value: TokenValue) {
		return this.some(t => t.matches(value));
	}

	/**
	 * Splits this collection into a head token and a tail collection.
	 *
	 * @returns An object with `head` (first token or null) and `tail` (remaining tokens)
	 */
	headAndTail(): { head: Token | null; tail: TokenCollection } {
		const copy = this.slice();
		const head = copy.shift();
		if (!head) {
			return { head: head ?? null, tail: TokenCollection._new([], this) };
		}
		const tail = TokenCollection._new(copy, this);
		return { head, tail };
	}

	/**
	 * Searches for the first token that includes the given value.
	 *
	 * @param value - The token value, type number, regex, or array to search for
	 * @returns The first matching token, or `null` if not found
	 */
	search(value: TokenValue) {
		for (const token of this) {
			if (token.includes(value)) {
				return token;
			}
		}
		return null;
	}

	/**
	 * Verifies that tokens alternate between the specified types in order.
	 *
	 * @param tokenNumbers - The expected repeating pattern of token types
	 * @param lastTokenNumber - Optional expected type for the last token
	 * @returns An error object if the pattern is violated, or `null` if valid
	 */
	takeTurns(tokenNumbers: ReadonlyArray<number>, lastTokenNumber?: number) {
		const tokens = this.slice();
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			if (!token) {
				continue;
			}
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

	/**
	 * Converts all tokens in this collection to plain JSON-serializable objects.
	 *
	 * @returns An array of plain token objects
	 */
	toJSON() {
		return this.map(t => t.toJSON());
	}

	private static _new(
		tokens: readonly Readonly<Token>[],
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		old?: TokenCollection,
	) {
		const newCollection = new TokenCollection('', old);
		newCollection.push(...tokens);
		return newCollection;
	}
}
