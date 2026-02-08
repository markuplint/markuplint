import type { Defs, Result } from './types.js';
import type { KeywordDefinedType, CssSyntax } from './types.schema.js';

import { isCSSSyntax } from './check-base.js';
import { cssSyntaxMatch } from './css-syntax.js';
import { log } from './debug.js';
import { matched } from './match-result.js';

const resultCache = new Map<string, Result>();
const CACHE_KEY_PREFIX = '@markuplint/types/checkKeywordType/cache:::';

/**
 * Checks a value against a keyword-defined type or CSS syntax type.
 *
 * Looks up the type in the definitions registry and validates the value.
 * If the type is not found in custom definitions, falls back to CSS syntax matching.
 * Results are cached by default for performance.
 *
 * @param value - The string value to check
 * @param type - The keyword type identifier to look up
 * @param defs - The type definitions registry
 * @param cache - Whether to use cached results (defaults to `true`)
 * @returns The validation result
 */
export function checkKeywordType(value: string, type: KeywordDefinedType, defs: Defs, cache = true) {
	const key = `${CACHE_KEY_PREFIX}${value}${type}`;
	if (cache) {
		const cachedResult = resultCache.get(key);
		if (cachedResult) {
			log('Restore cache: %s / %s', value, type);
			return cachedResult;
		}
	}
	const result = _checkKeywordType(value, type, defs);

	if (cache) {
		resultCache.set(key, result);
		if (log.enabled) {
			log('Cache checking: %O', {
				input: value,
				type,
				key,
				result: result,
			});
		}
	}

	return result;
}

function _checkKeywordType(value: string, type: KeywordDefinedType, defs: Defs): Result {
	const def = defs[type];
	if (!def) {
		log('The "%s" type is not defined in custom type identifier markuplint specified', type);
		try {
			return cssSyntaxMatch(value, type as CssSyntax);
		} catch (error) {
			if (error instanceof Error && error.message === 'MARKUPLINT_TYPE_NO_EXIST') {
				log("Allow all of any value because the type doesn't exist");
				return matched();
			}
			throw error;
		}
	}

	const matches = isCSSSyntax(def) ? cssSyntaxMatch(value, def) : def.is(value);

	if (!matches.matched) {
		return {
			...matches,
			ref: matches.ref ?? def.ref,
			expects: matches.expects ?? def.expects,
		};
	}
	return matches;
}
