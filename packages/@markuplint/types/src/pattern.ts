import type { Pattern, Result } from './types.js';
import type { ReadonlyDeep } from 'type-fest';

/**
 * Validates a string value against a pattern type definition.
 * The pattern can be either a regular expression literal in the form
 * `/pattern/flags` or a plain string for exact equality matching.
 *
 * @param value - The string value to validate
 * @param type - The pattern type definition containing the pattern string
 * @returns A result indicating whether the value matches the pattern
 */

export function checkPattern(value: string, type: ReadonlyDeep<Pattern>): Result {
	const regexMatch = type.pattern.match(/^\/(.*)\/([gim])*$/);
	if (regexMatch && regexMatch[1]) {
		const re = regexMatch[1];
		const flag = regexMatch[2];
		if (new RegExp(re, flag).test(value)) {
			return { matched: true };
		}
	} else if (value === type.pattern) {
		return { matched: true };
	}

	return {
		matched: false,
		ref: null,
		raw: value,
		length: value.length,
		offset: 0,
		line: 1,
		column: 1,
		reason: 'syntax-error',
		expects: [{ type: 'regexp', value: type.pattern }],
	};
}
