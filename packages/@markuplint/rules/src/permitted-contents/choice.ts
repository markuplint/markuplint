import type { ChildNode, MatchedReason, Options, Result, Specs } from './types.js';
import type { PermittedContentChoice } from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

import { bgBlue, bgGreen, cmLog } from './debug.js';
import { order } from './order.js';
import { Collection, modelLog } from './utils.js';

const indexes = new WeakMap<Result<MatchedReason>, number>();

export function choice(
	pattern: ReadonlyDeep<PermittedContentChoice>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	childNodes: readonly ChildNode[],
	specs: Specs,
	options: Options,
	depth: number,
): Result {
	const choiceLog = cmLog.extend(`choice#${depth}`);
	const collection = new Collection(childNodes);
	const unmatchedResults: Result[] = [];

	let i = 0;
	for (const some of pattern.choice) {
		choiceLog('Patterns[%s]: %s', i, modelLog(some, ''));

		const result = order(some, collection.unmatched, specs, options, depth + 1);

		if (
			result.type === 'MATCHED' ||
			result.type === 'MATCHED_ZERO' ||
			(result.type === 'UNEXPECTED_EXTRA_NODE' && result.matched.length > 0)
		) {
			choiceLog('Results[%s]: %s', i, choiceLogString(pattern.choice, i));

			return {
				type: result.type,
				matched: result.matched,
				unmatched: result.unmatched,
				zeroMatch: result.zeroMatch,
				query: result.query,
				hint: result.hint,
			};
		}

		unmatchedResults.push(result);
		collection.addMatched(result.matched);

		indexes.set(result, i);
		i++;
	}

	const barelyMatchedResult = unmatchedResults.sort((a, b) => {
		if (a.type !== b.type) {
			if (a.type === 'UNEXPECTED_EXTRA_NODE') {
				return -1;
			}
			if (b.type === 'UNEXPECTED_EXTRA_NODE') {
				return 1;
			}
		}
		const computed1 = b.matched.length - a.matched.length;
		if (computed1 !== 0) {
			return computed1;
		}
		const _a = a.hint.missing?.barelyMatchedElements ?? 0;
		const _b = b.hint.missing?.barelyMatchedElements ?? 0;
		const computed2 = _b - _a;
		return computed2;
	})[0];

	if (!barelyMatchedResult) {
		throw new Error('Unreachable code');
	}

	const index = indexes.get(barelyMatchedResult);
	if (index != null) {
		choiceLog('Results[%s]: %s', index, choiceLogString(pattern.choice, index, true));
	}

	return {
		type: barelyMatchedResult.type,
		matched: collection.matched,
		unmatched: collection.unmatched,
		zeroMatch: barelyMatchedResult.zeroMatch,
		query: barelyMatchedResult.query,
		hint: barelyMatchedResult.hint,
	};
}

function choiceLogString(choice: ReadonlyDeep<PermittedContentChoice['choice']>, index: number, barely = false) {
	const colorFn = barely ? bgBlue : bgGreen;
	return choice
		.map((pattern, i) => {
			if (i === index) {
				return colorFn(modelLog(pattern, ''));
			}
			return modelLog(pattern, '');
		})
		.join(', ');
}
