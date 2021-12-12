import type { Result } from './types';
import type { List } from './types.schema';

import { check } from './check';
import { matched } from './match-result';
import { Token, TokenCollection } from './token';

export function checkList(value: string, type: List, ref?: string, cache = true): Result {
	const tokens = new TokenCollection(value, type);

	const matches = tokens.check({ ref });

	if (!matches.matched) {
		return matches;
	}

	const identTokens = tokens.getIdentTokens();

	for (const token of identTokens) {
		const res = check(token.value, type.token, ref, cache);
		if (!res.matched) {
			const { offset, line, column } = Token.shiftLocation(token, res.offset);
			return {
				...res,
				partName: res.partName || 'the content of the list',
				offset,
				line,
				column,
			};
		}
	}

	return matched();
}
