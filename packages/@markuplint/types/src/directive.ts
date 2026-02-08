import type { Result, Directive, UnmatchedResult, Defs } from './types.js';
import type { ReadonlyDeep } from 'type-fest';

import { regexParser } from '@markuplint/shared';

import { checkBase } from './check-base.js';
import { matched, unmatched } from './match-result.js';

/**
 * Checks a value against a directive type definition.
 *
 * A directive type consists of a prefix pattern (string or regex) followed by
 * a token value. This function extracts the token portion after the directive
 * prefix and validates it against the token type.
 *
 * @param value - The string value to check
 * @param type - The directive type definition containing directive patterns and token type
 * @param defs - The type definitions registry for resolving nested types
 * @param ref - Optional reference URL for the unmatched result
 * @param cache - Whether to use cached results (defaults to `true`)
 * @returns The validation result
 */
export function checkDirective(
	value: string,
	type: ReadonlyDeep<Directive>,
	defs: Defs,
	ref?: string,
	cache = true,
): Result {
	const unmatches: UnmatchedResult[] = [];

	for (const directive of type.directive) {
		const directiveMatcher = regexParser(directive);

		let tokenPart: string;

		if (directiveMatcher) {
			const matched = directiveMatcher.exec(value);

			if (!matched) {
				unmatches.push(
					unmatched(value, 'missing-token', {
						ref: ref ?? type.ref,
					}),
				);
				continue;
			}

			tokenPart = matched.groups?.token ?? matched[1] ?? '';
		} else {
			if (!value.startsWith(directive)) {
				unmatches.push(
					unmatched(value, 'missing-token', {
						ref: ref ?? type.ref,
					}),
				);
				continue;
			}

			tokenPart = value.slice(directive.length);
		}

		const result = checkBase(tokenPart, type.token, defs, ref, cache);
		if (result.matched) {
			return result;
		}

		unmatches.push(result);
	}

	return unmatches.at(0) ?? matched();
}
