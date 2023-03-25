import type { Result } from './types';
import type { Enum } from './types.schema';
import type { ReadonlyDeep } from 'type-fest';

import { matched, unmatched } from './match-result';

export function checkEnum(value: string, type: ReadonlyDeep<Enum>, ref?: string): Result {
	const disallowToSurroundBySpaces = type.disallowToSurroundBySpaces ?? true;
	const caseInsensitive = type.caseInsensitive ?? true;
	if (!disallowToSurroundBySpaces) {
		value = value.trim();
	}
	let values = type.enum.slice();
	if (caseInsensitive) {
		value = value.toLowerCase();
		values = type.enum.map(v => v.toLowerCase());
	}
	const res = values.includes(value);
	if (res) {
		return matched();
	}
	return unmatched(value, 'doesnt-exist-in-enum', {
		ref,
		expects: type.enum.map(value => ({ type: 'const', value })),
	});
}
