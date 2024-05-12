import type { Result, Directive, UnmatchedResult } from './types.js';
import type { ReadonlyDeep } from 'type-fest';

import { regexParser } from '@markuplint/shared';

import { check } from './check.js';
import { matched, unmatched } from './match-result.js';

export function checkDirective(value: string, type: ReadonlyDeep<Directive>, ref?: string, cache = true): Result {
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

		const result = check(tokenPart, type.token, ref, cache);
		if (result.matched) {
			return result;
		}

		unmatches.push(result);
	}

	return unmatches.at(0) ?? matched();
}
