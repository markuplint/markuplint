import type { CustomSyntaxCheck, UnmatchedResult } from './types';

import { log } from './debug';
import { matched } from './match-result';

export function checkMultiTypes(value: string, checks: CustomSyntaxCheck[]) {
	let unmatched: UnmatchedResult | undefined;

	for (const check of checks) {
		const res = check(value);
		if (res.matched) {
			return res;
		}

		// @ts-ignore
		res._fn = check.name;

		// @ts-ignore
		log('%s(%d) vs %s(%d)', unmatched?._fn, unmatched?.passCount, res._fn, res.passCount);
		const passedA = unmatched?.passCount || 0;
		const passedB = res.passCount || 0;
		const offsetA = unmatched?.offset || 0;
		const offsetB = res.offset;

		if (passedA < passedB || (passedA === passedB && offsetA <= offsetB)) {
			unmatched = res;
		}
	}

	const result = unmatched || matched();

	log('%d checks result: %O', checks.length, result);

	return result;
}
