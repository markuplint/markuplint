import type { Result } from './types';
import type { KeywordDefinedType, CssSyntax } from './types.schema';

import { isCSSSyntax } from './check';
import { cssSyntaxMatch } from './css-syntax';
import { log } from './debug';
import { types } from './defs';
import { matched } from './match-result';

const resultCache = new Map<string, Result>();
const CACHE_KEY_PREFIX = '@markuplint/types/checkKeywordType/cache:::';

export function checkKeywordType(value: string, type: KeywordDefinedType, cache = true) {
	const key = `${CACHE_KEY_PREFIX}${value}${type}`;
	if (cache) {
		const cachedResult = resultCache.get(key);
		if (cachedResult) {
			log('Restore cache: %s / %s', value, type);
			return cachedResult;
		}
	}
	const result = _checkKeywordType(value, type);

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

function _checkKeywordType(value: string, type: KeywordDefinedType): Result {
	const def = types[type];
	if (!def) {
		log('The "%s" type is not defined in custom type identifier markuplint specified', type);
		try {
			return cssSyntaxMatch(value, type as CssSyntax);
		} catch (e) {
			if (e instanceof Error && e.message === 'MARKUPLINT_TYPE_NO_EXIST') {
				log("Allow all of any value because the type doesn't exist");
				return matched();
			}
			throw e;
		}
	}

	const matches = isCSSSyntax(def) ? cssSyntaxMatch(value, def) : def.is(value);

	if (!matches.matched) {
		return {
			...matches,
			ref: matches.ref || def.ref,
			expects: matches.expects || def.expects,
		};
	}
	return matches;
}
