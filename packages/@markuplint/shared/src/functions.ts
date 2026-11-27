import type { Nullable } from './types.js';

import { decode as decodeHtmlEntities } from 'html-entities';

/**
 * Converts a given value of string, string array, null, or undefined
 * into an array of non-empty strings.
 *
 * If a string is provided, it wraps it into an array. If null or undefined
 * is provided, an empty array is returned.
 *
 * @param value The input value to be converted to a non-empty string array.
 * @returns The resulting array of non-empty strings derived from the input value.
 */
export function toNoEmptyStringArrayFromStringOrArray(
	value: string | readonly string[] | null | undefined,
): readonly string[] {
	const array = typeof value === 'string' ? [value] : (value ?? []);
	return array.filter(noEmptyFilter);
}

/**
 * Converts a given value of an item or an array of items into
 * an array of non-nullable items.
 *
 * @template T The type of the items in the input value.
 * @param value The input value to be converted to a non-nullable item array.
 * @returns The resulting array of non-nullable items derived from the input value.
 */
export function toNonNullableArrayFromItemOrArray<T>(value: T | readonly T[]): readonly NonNullable<T>[] {
	const array: T[] = Array.isArray(value) ? (value as T[]) : [value as T];
	// @ts-ignore
	return array.filter(nonNullableFilter);
}

/**
 * A filter function for use with the `Array.filter` method,
 * which determines if the given string item is non-empty.
 *
 * @param item The string item to be checked for non-emptiness.
 * @returns Returns true if the item is a non-empty string, otherwise false.
 */
export function noEmptyFilter(item: string): item is string {
	return item !== '';
}

/**
 * A filter function for use with the Array.filter method,
 * which determines if the given item is non-nullable.
 *
 * @template T The type of the items in the array.
 * @param item The item to be checked for non-nullability.
 * @returns Returns true if the item is non-nullable, otherwise false.
 */
export function nonNullableFilter<T>(item: Nullable<T>): item is T {
	return item != null;
}

/**
 * Decodes the provided text by replacing HTML entities
 * with their corresponding characters.
 *
 * The decoding process uses the 'html5' (HTML Standard) level.
 *
 * Unknown entities are left as they are.
 *
 * @param text The input text containing HTML entities to be decoded.
 * @returns The decoded text with HTML entities replaced by their corresponding characters.
 */
export function decodeEntities(text: string) {
	return decodeHtmlEntities(text, { level: 'html5' });
}

/**
 * Decodes the provided URL string (href) using
 * the `decodeURIComponent` function.
 *
 * If a `URIError` is encountered,
 * the original href is returned. Any other errors are propagated.
 *
 * @param href The URL string to be decoded.
 * @returns The decoded URL string or the original href if a `URIError` occurs.
 */
export function decodeHref(href: string) {
	try {
		return decodeURIComponent(href);
	} catch (error: unknown) {
		if (error instanceof URIError) {
			return href;
		}
		throw error;
	}
}

/**
 * Converts an array of branches into an array of patterns.
 *
 * @example
 * ```ts
 * branchesToPatterns([1, [2, 3]]) // [[1, 2], [1, 3]]
 * branchesToPatterns([1, [2, 3], 4]) // [[1, 2, 4], [1, 3, 4]]
 * branchesToPatterns([1, [2, undefined], 3]) // [[1, 2, 3], [1, 3]]
 * branchesToPatterns([1, [2, 3], [4, 5], 6]) // [[1, 2, 4, 6], [1, 3, 4, 6], [1, 2, 5, 6], [1, 3, 5, 6]]
 * branchesToPatterns([1, [], 2]) // [[1, 2]]
 * ```
 *
 * @template T The type of elements in the branches array.
 * @param branches The array of branches to convert.
 * @returns The array of patterns generated from the branches.
 */
export function branchesToPatterns<T>(branches: ReadonlyArray<Nullable<T> | ReadonlyArray<Nullable<T>>>): T[][] {
	// eslint-disable-next-line unicorn/no-array-reduce
	return branches.reduce<T[][]>(
		(accumulator, current) => {
			if (Array.isArray(current)) {
				if (current.length === 0) {
					return accumulator;
				}
				return current.flatMap(item =>
					accumulator.map(pattern => [...pattern, item].filter(nonNullableFilter)),
				);
			}
			return accumulator.map(pattern => [...pattern, current].filter(nonNullableFilter));
		},
		[[]],
	);
}

/**
 * Parses a regular expression pattern in the form of `/pattern/flags`.
 * The pattern is parsed using the `RegExp` constructor.
 * If the pattern is invalid, `null` is returned.
 * The pattern must be a valid regular expression pattern.
 * Throws an error if the pattern or flags are invalid.
 *
 * @param regexpLikeString - The regular expression pattern to parse.
 * @returns - The parsed regular expression or null if the pattern is invalid.
 */
/**
 * Computes the line and column of a position within a code fragment.
 *
 * @param rawCodeFragment - The full raw source text
 * @param startOffset - The zero-based byte offset to compute the position of
 * @returns An object containing one-based `line` and `column`
 */
export function getPosition(rawCodeFragment: string, startOffset: number) {
	const lines = rawCodeFragment.slice(0, startOffset).split('\n');
	const line = lines.length;
	const column = (lines.at(-1) ?? '').length + 1;
	return { line, column } as const;
}

export function regexParser(regexpLikeString: string): RegExp | null {
	if (!regexpLikeString.startsWith('/')) {
		// Early return if the string does not start with a slash.
		return null;
	}
	const match = regexpLikeString.match(/^\/(?<pattern>.+)\/(?<flags>[dgimsuvy]*)$/);
	if (!match) {
		return null;
	}
	const { pattern, flags } = match.groups!;
	if (!pattern) {
		return null;
	}
	// Throws an error if `pattern` or `flags` is invalid.
	return new RegExp(pattern, flags);
}

/**
 * Lower-cases only the ASCII letters `A-Z` of a name, as the HTML syntax does when it reads an
 * attribute name.
 * `toLowerCase` also folds letters outside ASCII, such as U+212A KELVIN SIGN into `k`, which turns
 * two names the DOM keeps apart into one. Decide *whether* to fold by the syntax and the element
 * (see `MLAttr#nameKey` of `@markuplint/ml-core`); this only does the folding.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#attribute-name-state
 * @param name - A name as written
 * @returns The name with `A-Z` lower-cased, the same string when there is nothing to fold
 */
export function asciiLowerCase(name: string): string {
	// Most names are lower case already, so skip the replace (and its allocation) for them.
	return /[A-Z]/.test(name) ? name.replaceAll(/[A-Z]/g, c => c.toLowerCase()) : name;
}

/**
 * Splits a string into its tokens on ASCII white space only (U+0009, U+000A, U+000C, U+000D, U+0020),
 * dropping the empty ones.
 * `split(/\s+/)` also splits on U+00A0, U+2028, U+FEFF and the other non-ASCII white space, which
 * turns one token of a space-separated list (an ID reference list, `class`, `role`) into several.
 *
 * @see https://infra.spec.whatwg.org/#split-on-ascii-whitespace
 * @see https://infra.spec.whatwg.org/#ascii-whitespace
 * @param value - A string as written
 * @returns The tokens; `[]` for a string that is white space only
 */
export function splitOnAsciiWhitespace(value: string): string[] {
	return value.split(/[\t\n\f\r ]+/).filter(Boolean);
}

/**
 * ASCII white space: U+0009, U+000A, U+000C, U+000D and U+0020.
 *
 * @see https://infra.spec.whatwg.org/#ascii-whitespace
 */
const ASCII_WHITESPACE: ReadonlySet<string> = new Set(['\t', '\n', '\f', '\r', ' ']);

/**
 * Trims ASCII white space only (U+0009, U+000A, U+000C, U+000D, U+0020).
 * `String#trim` also removes U+00A0, U+FEFF and the other non-ASCII white space, which are part of a
 * value as the HTML syntax reads it.
 *
 * @see https://infra.spec.whatwg.org/#strip-leading-and-trailing-ascii-whitespace
 * @param value - A string as written
 * @returns The string without the ASCII white space at both ends
 */
export function trimAsciiWhitespace(value: string): string {
	// Two scans from the ends, not a regular expression with an `$` alternative, which scans the rest of
	// a long run of white space in the middle of the string again from each of its positions.
	let start = 0;
	let end = value.length;
	while (start < end && ASCII_WHITESPACE.has(value.charAt(start))) {
		start++;
	}
	while (end > start && ASCII_WHITESPACE.has(value.charAt(end - 1))) {
		end--;
	}
	return value.slice(start, end);
}

/**
 * Whether a value holds a character other than ASCII white space (U+0009, U+000A, U+000C, U+000D, U+0020).
 * `null` and `undefined` (an absent attribute) hold none. U+00A0, U+FEFF, U+2028 and the other
 * non-ASCII white space are characters, so a value made of them only has text.
 *
 * @see https://infra.spec.whatwg.org/#ascii-whitespace
 * @param value - A string as written, or an absent value
 * @returns `true` if the value is a string that is not empty after {@link trimAsciiWhitespace}
 */
export function hasText(value?: string | null): boolean {
	return value != null && trimAsciiWhitespace(value) !== '';
}

/**
 * Whether the whole of a string is a valid integer.
 * `Number.parseInt` and `Number.parseFloat` skip leading non-ASCII white space (U+00A0, …) and ignore what
 * follows the number, so they take `\u00A05` and `5abc` for 5.
 *
 * WAI-ARIA defines no syntax for its `integer` value type. The HTML microsyntax stands in for it, as it does
 * for the numbers of HTML attributes, so `+5` and `5.0` are not integers.
 *
 * > A string is a valid integer if it consists of one or more ASCII digits, optionally prefixed with a U+002D HYPHEN-MINUS character (-).
 *
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#signed-integers
 * @see https://w3c.github.io/aria/#valuetype_integer
 * @param value - A string as written; it is not trimmed
 * @returns `true` if the string is a valid integer
 */
export function isValidInteger(value: string): boolean {
	return /^-?\d+$/.test(value);
}

/**
 * Whether the whole of a string is a valid floating-point number: `5.0`, `05` and `.5` are, `5.` and `+5` are not.
 * WAI-ARIA defines no syntax for its `number` value type. The HTML microsyntax stands in for it, as it does
 * for the numbers of HTML attributes.
 *
 * > A string is a valid floating-point number if it consists of:
 *
 * @see https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-floating-point-number
 * @see https://w3c.github.io/aria/#valuetype_number
 * @param value - A string as written; it is not trimmed
 * @returns `true` if the string is a valid floating-point number
 */
export function isValidFloatingPointNumber(value: string): boolean {
	return /^-?(?:\d+|\d*\.\d+)(?:E[+-]?\d+)?$/i.test(value);
}
