import type { ChildNode, Mode, Options, Result, Specs, TagRule } from './types.js';
import type { PermittedContentPattern } from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

import { deepCopy } from '../helpers.js';

import { complexBranch } from './complex-branch.js';
import { cmLog } from './debug.js';
import { Collection, mergeHints, modelLog } from './utils.js';

/**
 * Validates an ordered sequence of content model patterns against a list of child nodes.
 * Each pattern in the `contents` array is matched in order against the remaining unmatched
 * child nodes, consuming nodes as they match. This implements the sequential composition
 * semantics of HTML content models (e.g., "a `<caption>` followed by zero or more `<colgroup>`s
 * followed by a `<thead>`...").
 *
 * Supports backtracking: when a pattern matches zero nodes (zeroMatch), the algorithm
 * can backtrack to try the next pattern from the previous position if the current pattern fails.
 *
 * @param contents - An ordered array of content model patterns to match sequentially.
 * @param childNodes - The child nodes to validate against the patterns.
 * @param rules - User-defined tag rules. `order` does not consult them directly; they are
 *                threaded through so nested helpers (especially `representTransparentNodes`)
 *                can resolve content models via `resolveContentModel`. Do not remove even if
 *                it looks unused here.
 * @param specs - The resolved spec data for content model lookups.
 * @param options - Validation behavior options.
 * @param depth - The current recursion depth, used for debug logging and nested pattern matching.
 * @param mode - Whether we are evaluating the element's `'origin'` or `'pretended'` identity.
 *               Propagated unchanged into `complexBranch` so downstream selector matching
 *               honors the same view.
 * @returns A result indicating overall match status and the matched/unmatched node partitioning.
 */
export function order(
	contents: ReadonlyDeep<PermittedContentPattern[]>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	childNodes: readonly ChildNode[],
	rules: readonly TagRule[],
	specs: Specs,
	options: Options,
	depth: number,
	mode: Mode,
): Result {
	const orderLog = cmLog.extend(`order#${depth}`);
	const btLog = cmLog.extend(`backtrack#${depth}`);

	const patterns = deepCopy(contents);
	const collection = new Collection(childNodes);

	orderLog('Model:\n  RegEx: %s\n  Schema: %o', modelLog(patterns, ''), patterns);
	orderLog('Starts: %s', collection);

	let result: Result | undefined = undefined;
	let backtrackMode = false;
	let afterBacktrack = false;

	const unmatchedResults: Result[] = [];

	while (patterns.length > 0 && patterns[0]) {
		result = complexBranch(patterns[0], collection.unmatched, rules, specs, options, depth, mode);
		collection.addMatched(result.matched);

		if (result.type !== 'UNEXPECTED_EXTRA_NODE' && result.type !== 'MATCHED' && result.type !== 'MATCHED_ZERO') {
			unmatchedResults.push(result);

			if (backtrackMode) {
				collection.back();
				btLog('🔙◀BACK');
				backtrackMode = false;
				afterBacktrack = true;
				continue;
			}

			const barelyMatchedResult = unmatchedResults.toSorted((a, b) => b.matched.length - a.matched.length)[0];

			if (!barelyMatchedResult) {
				throw new Error('Unreachable code');
			}

			orderLog(
				'Result (%s): %s%s',
				result.type,
				collection.toString(true),
				barelyMatchedResult.hint.missing?.barelyMatchedElements == null
					? ''
					: `; But ${barelyMatchedResult.hint.missing.barelyMatchedElements} elements hit out of pattern`,
			);

			return {
				type: barelyMatchedResult.type,
				matched: collection.matched,
				unmatched: collection.unmatched,
				zeroMatch: barelyMatchedResult.zeroMatch,
				query: barelyMatchedResult.query,
				hint: mergeHints(barelyMatchedResult.hint, {
					missing: {
						barelyMatchedElements: collection.matched.length,
						need: barelyMatchedResult.query,
					},
				}),
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

	if (collection.unmatched.length > 0) {
		orderLog('Result (UNEXPECTED_EXTRA_NODE): %s', collection.toString(true));
		return {
			type: 'UNEXPECTED_EXTRA_NODE',
			matched: collection.matched,
			unmatched: collection.unmatched,
			zeroMatch: false,
			query: result?.query ?? 'N/A',
			hint: result?.hint ?? {},
		};
	}

	const resultType = collection.matched.length > 0 ? 'MATCHED' : 'MATCHED_ZERO';

	orderLog('Result (%s): %s', resultType, collection.toString(true));

	return {
		type: resultType,
		matched: collection.matched,
		unmatched: collection.unmatched,
		zeroMatch: false,
		query: result?.query ?? 'N/A',
		hint: result?.hint ?? {},
	};
}
