import type { ChildNode, Options, Result, Specs } from './types';
import type { PermittedContentPattern } from '@markuplint/ml-spec';

import { deepCopy } from '../helpers';

import { complexBranch } from './complex-branch';
import { cmLog } from './debug';
import { Collection } from './utils';

/**
 * Check ordered array
 *
 * @param contents
 * @param nodes
 * @param specs
 * @param options
 * @param depth
 * @returns
 */
export function order(
	contents: ReadonlyArray<PermittedContentPattern>,
	nodes: ReadonlyArray<ChildNode>,
	specs: Specs,
	options: Options,
	depth: number,
): Result {
	const orderLog = cmLog.extend(`order#${depth}`);
	const btLog = cmLog.extend(`backtrack#${depth}`);

	const patterns = deepCopy(contents);
	const collection = new Collection(nodes);

	orderLog('Starts: %s', collection);

	let result: Result | undefined = undefined;
	let backtrackMode = false;
	let afterBacktrack = false;

	const unmatchedResults: Result[] = [];

	while (patterns.length) {
		result = complexBranch(patterns[0], collection.unmatched, specs, options, depth);
		collection.addMatched(result.matched);
		orderLog('stack: %s', collection);

		if (result.type !== 'UNEXPECTED_EXTRA_NODE' && result.type !== 'MATCHED' && result.type !== 'MATCHED_ZERO') {
			unmatchedResults.push(result);

			if (backtrackMode) {
				collection.back();
				btLog('🔙');
				backtrackMode = false;
				afterBacktrack = true;
				continue;
			}

			orderLog('conformed (%s): %s', result.type, collection.toString(true));

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

		if (afterBacktrack) {
			collection.lock();
			afterBacktrack = false;
		}

		if (result.zeroMatch) {
			backtrackMode = true;
		} else {
			backtrackMode = false;
		}

		patterns.shift();
	}

	if (collection.unmatched.length) {
		orderLog('Conformed (UNEXPECTED_EXTRA_NODE): %s', collection.toString(true));
		return {
			type: 'UNEXPECTED_EXTRA_NODE',
			matched: collection.matched,
			unmatched: collection.unmatched,
			zeroMatch: false,
			query: result?.query ?? 'N/A',
			hint: result?.hint ?? {},
		};
	}

	orderLog('Conformed: %s', collection);
	return {
		type: collection.matched.length ? 'MATCHED' : 'MATCHED_ZERO',
		matched: collection.matched,
		unmatched: collection.unmatched,
		zeroMatch: false,
		query: result?.query ?? 'N/A',
		hint: result?.hint ?? {},
	};
}
