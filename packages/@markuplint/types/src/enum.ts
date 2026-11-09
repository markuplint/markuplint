import type { Result } from './types.js';
import type { Enum } from './types.schema.js';
import type { ReadonlyDeep } from 'type-fest';

import { matched, unmatched } from './match-result.js';

/**
 * Compares a folded copy. The reported `raw` stays the authored text, including
 * its case and, when surrounding spaces are allowed for the comparison, those
 * spaces. Folding the string that is reported made `raw` disagree with the
 * source (`FETCH` was reported as `fetch`).
 *
 * @param value - The authored attribute value
 * @param type - The enum to compare against
 * @param ref - An optional reference passed through to the mismatch
 * @returns A match, or a mismatch whose `raw` is `value`
 */
export function checkEnum(value: string, type: ReadonlyDeep<Enum>, ref?: string): Result {
	const disallowToSurroundBySpaces = type.disallowToSurroundBySpaces ?? true;
	const caseInsensitive = type.caseInsensitive ?? true;
	let comparable = value;
	if (!disallowToSurroundBySpaces) {
		comparable = comparable.trim();
	}
	let values = [...type.enum];
	if (caseInsensitive) {
		comparable = comparable.toLowerCase();
		values = type.enum.map(token => token.toLowerCase());
	}
	if (values.includes(comparable)) {
		return matched();
	}
	return unmatched(value, 'doesnt-exist-in-enum', {
		ref,
		expects: type.enum.map(token => ({ type: 'const', value: token })),
	});
}
