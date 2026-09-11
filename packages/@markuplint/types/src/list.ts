import type { Defs, Result } from './types.js';
import type { List } from './types.schema.js';
import type { ReadonlyDeep } from 'type-fest';

import { checkBase } from './check-base.js';
import { matched } from './match-result.js';
import { Token, TokenCollection } from './token/index.js';

export function checkList(value: string, type: ReadonlyDeep<List>, defs: Defs, ref?: string, cache = true): Result {
	const tokens = new TokenCollection(value, type);

	const matches = tokens.check({ ref });

	if (!matches.matched) {
		return matches;
	}

	const identTokens = tokens.getIdentTokens();

	for (const token of identTokens) {
		const res = checkBase(token.value, type.token, defs, ref, cache);
		if (!res.matched) {
			const { offset, line, column } = Token.shiftLocation(token, res.offset);
			return {
				...res,
				partName: res.partName ?? 'the content of the list',
				offset,
				line,
				column,
			};
		}
	}

	return matched();
}
