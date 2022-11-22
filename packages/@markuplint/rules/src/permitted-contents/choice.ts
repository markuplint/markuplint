import type { ChildNode, Options, Result, Specs } from './types';
import type { PermittedContentChoice } from '@markuplint/ml-spec';

import { order } from './order';
import { Collection } from './utils';

export function choice(
	pattern: PermittedContentChoice,
	elements: ChildNode[],
	specs: Specs,
	options: Options,
	depth: number,
): Result {
	const collection = new Collection(elements);

	const unmatchedResults: Result[] = [];

	for (const some of pattern.choice) {
		const result = order(some, collection.unmatched, specs, options, depth + 1);

		if (result.type === 'UNEXPECTED_EXTRA_NODE' || result.type === 'MATCHED' || result.type === 'MATCHED_ZERO') {
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
	}

	const barelyMatchedResult = unmatchedResults.sort((a, b) => b.matched.length - a.matched.length)[0];

	if (!barelyMatchedResult) {
		throw new Error('Unreachable code');
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
