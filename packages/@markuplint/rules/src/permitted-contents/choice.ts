import type { ChildNode, MatchedReason, Options, Result, Specs } from './types';
import type { PermittedContentChoice } from '@markuplint/ml-spec';

import { bgBlue, bgGreen, cmLog } from './debug';
import { order } from './order';
import { Collection, modelLog } from './utils';

const indexes = new WeakMap<Result<MatchedReason>, number>();

export function choice(
	pattern: PermittedContentChoice,
	elements: ChildNode[],
	specs: Specs,
	options: Options,
	depth: number,
): Result {
	const choiceLog = cmLog.extend(`choice#${depth}`);

	const collection = new Collection(elements);

	const unmatchedResults: Result[] = [];

	let i = 0;
	for (const some of pattern.choice) {
		choiceLog('Patterns[%s]: %s', i, modelLog(some, ''));

		const result = order(some, collection.unmatched, specs, options, depth + 1);

		if (result.type === 'UNEXPECTED_EXTRA_NODE' || result.type === 'MATCHED' || result.type === 'MATCHED_ZERO') {
			choiceLog('Results[%s]: %s', i, choiceLogString(pattern.choice, i));
			collection.addMatched(result.matched);
			return {
				type: result.type,
				matched: collection.matched,
				unmatched: collection.unmatched,
				zeroMatch: result.zeroMatch,
				query: result.query,
				hint: result.hint,
			};
		}

		unmatchedResults.push(result);

		indexes.set(result, i);
		i++;
	}

	const barelyMatchedResult = unmatchedResults.sort((a, b) => {
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

function choiceLogString(choice: PermittedContentChoice['choice'], index: number, barely = false) {
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
