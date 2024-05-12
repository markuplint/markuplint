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
	const array = typeof value === 'string' ? [value] : value ?? [];
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
export function regexParser(regexpLikeString: string): RegExp | null {
	if (!regexpLikeString.startsWith('/')) {
		// Early return if the string does not start with a slash.
		return null;
	}
	const match = regexpLikeString.match(/^\/(?<pattern>.+)\/(?<flags>[dgimsuvy]*)$/); // cspell: disable-line
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
