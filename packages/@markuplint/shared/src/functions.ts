import type { Nullable } from './types.js';

import { decode as decodeHtmlEntities, decodeEntity } from 'html-entities';

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
	// A numeric character reference to a surrogate is U+FFFD (a surrogate-character-reference parse error), where
	// `html-entities` would make a lone surrogate of it.
	// @see https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
	const withoutSurrogates = text.includes('&#')
		? text.replaceAll(/&#(x[\dA-F]+|\d+);?/gi, (reference, digits: string) => {
				const code = /^x/i.test(digits) ? Number.parseInt(digits.slice(1), 16) : Number.parseInt(digits, 10);
				// U+D800 to U+DFFF
				return code >= 55_296 && code <= 57_343 ? '\uFFFD' : reference;
			})
		: text;
	return decodeHtmlEntities(withoutSurrogates, { level: 'html5' });
}

/**
 * How the character references of an attribute value are decoded (`AttrValueDecoding` of `@markuplint/ml-ast`, which
 * this package does not depend on, says which language does which): `html` as the HTML tokenizer decodes an attribute
 * value, `jsx` as JSX decodes a string attribute (the XHTML set of names, a semicolon required), `mdx` as MDX does
 * (the HTML set of names, a semicolon required), and `none` not at all.
 */
export type AttrValueDecoding = 'html' | 'jsx' | 'mdx' | 'none';

/**
 * An attribute value with its character references decoded, and where each of its characters is in the source.
 */
export interface DecodedAttrValue {
	/** The value */
	readonly value: string;
	/**
	 * The offset in the source of each code unit of the value, and the length of the source after the last: the code
	 * units of a reference are at the start of the reference, so a range `[start, end)` of the value is the range
	 * `[offsets[start], offsets[end])` of the source.
	 */
	readonly offsets: readonly number[];
}

/**
 * Decodes the character references of an attribute value as written in the source, keeping where each character of
 * the value is in it.
 *
 * In the HTML syntax a named reference that does not end with a semicolon is not decoded in an attribute value when
 * the next character is `=` or an ASCII alphanumeric (`title="&notit"` is `&notit`), as the named character reference
 * state says:
 *
 * > If the character reference was consumed as part of an attribute, and the last character matched is not a U+003B SEMICOLON character (;), and the next input character is either a U+003D EQUALS SIGN character (=) or an ASCII alphanumeric, then, for historical reasons, flush code points consumed as a character reference and switch to the return state.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#named-character-reference-state
 * @see https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/typescript-estree/src/node-utils.ts#unescapeStringLiteralText
 * @see https://github.com/syntax-tree/mdast-util-mdx-jsx/blob/main/lib/index.js#exitMdxJsxTagAttributeValueLiteral
 * @param raw - The value as written, without its quotes
 * @param decoding - How the language decodes it
 * @returns The value and the offsets of its characters in `raw`
 */
export function decodeAttrValue(raw: string, decoding: AttrValueDecoding = 'html'): DecodedAttrValue {
	if (decoding === 'none' || !raw.includes('&')) {
		return { value: raw, offsets: Array.from({ length: raw.length + 1 }, (_, i) => i) };
	}
	let value = '';
	const offsets: number[] = [];
	const append = (chars: string, offset: number) => {
		value += chars;
		for (let i = 0; i < chars.length; i++) {
			offsets.push(offset);
		}
	};
	let index = 0;
	while (index < raw.length) {
		const reference = raw[index] === '&' ? readReference(raw, index, decoding) : null;
		if (reference) {
			append(reference.chars, index);
			index += reference.length;
			continue;
		}
		append(raw[index] ?? '', index);
		index++;
	}
	offsets.push(raw.length);
	return { value, offsets };
}

/**
 * @param raw - The value as written
 * @param index - The offset of a `&` in it
 * @param decoding - How the language decodes it
 * @returns The characters of the reference that starts there and its length in `raw`, or null if none starts there
 */
function readReference(
	raw: string,
	index: number,
	decoding: AttrValueDecoding,
): { readonly chars: string; readonly length: number } | null {
	const rest = raw.slice(index);
	if (decoding === 'jsx') {
		// JSX takes the code point as it is, with a lower-case `x` and a semicolon (`unescapeStringLiteralText`)
		const jsxNumeric = /^&#(?:x([\dA-Fa-f]+)|(\d+));/.exec(rest);
		if (jsxNumeric) {
			const code = jsxNumeric[1] === undefined ? Number(jsxNumeric[2]) : Number.parseInt(jsxNumeric[1], 16);
			return code <= 1_114_111 ? { chars: String.fromCodePoint(code), length: jsxNumeric[0].length } : null;
		}
	}
	const numeric = /^&#(?:X[\dA-F]+|\d+)(;?)/i.exec(rest);
	if (numeric) {
		// JSX and MDX require the semicolon, and JSX reads it above
		if (decoding !== 'html' && (decoding === 'jsx' || numeric[1] !== ';')) {
			return null;
		}
		return { chars: decodeEntities(numeric[0]), length: numeric[0].length };
	}
	const run = /^&[A-Z][\dA-Z]*;?/i.exec(rest)?.[0];
	if (!run) {
		return null;
	}
	for (let length = run.length; length > 1; length--) {
		const candidate = run.slice(0, length);
		const hasSemicolon = candidate.endsWith(';');
		if (decoding !== 'html') {
			if (!hasSemicolon) {
				continue;
			}
			// The XHTML set of JSX is the HTML 4 set and `apos`; MDX has the HTML set
			const chars =
				decoding === 'jsx' && candidate === '&apos;'
					? "'"
					: decodeEntity(candidate, { level: decoding === 'jsx' ? 'html4' : 'html5' });
			if (chars !== candidate) {
				return { chars, length };
			}
			continue;
		}
		const chars = decodeEntity(candidate, { level: 'html5' });
		if (chars === candidate) {
			continue;
		}
		const next = raw[index + length] ?? '';
		if (!hasSemicolon && /^[\d=A-Z]$/i.test(next)) {
			return null;
		}
		return { chars, length };
	}
	return null;
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
