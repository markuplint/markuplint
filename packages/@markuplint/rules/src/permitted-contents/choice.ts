import type { ChildNode, MatchedReason, Mode, Options, Result, Specs, TagRule } from './types.js';
import type { PermittedContentChoice } from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

import { bgBlue, bgGreen, cmLog } from './debug.js';
import { order } from './order.js';
import { Collection, modelLog } from './utils.js';

/**
 * WeakMap that tracks which choice branch index produced each result,
 * used for debug logging to identify the best-matching branch.
 */
const indexes = new WeakMap<Result<MatchedReason>, number>();

/**
 * Evaluates a choice (alternation) pattern against a list of child nodes.
 * Tries each branch of the choice in order and returns the first successful match.
 * If no branch fully matches, selects the "barely matched" result that consumed
 * the most nodes, preferring `UNEXPECTED_EXTRA_NODE` results (which indicate
 * partial progress) over missing-node results.
 *
 * This implements the alternation (`|`) semantics found in content model definitions,
 * e.g., "either flow content or phrasing content".
 *
 * @param pattern - The choice pattern containing multiple alternative content model branches.
 * @param childNodes - The child nodes to validate against the choice branches.
 * @param specs - The resolved spec data for content model lookups.
 * @param options - Validation behavior options.
 * @param depth - The current recursion depth, used for debug logging and nested evaluation.
 * @returns A result from the best-matching branch, or the branch that came closest to matching.
 */
export function choice(
	pattern: ReadonlyDeep<PermittedContentChoice>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	childNodes: readonly ChildNode[],
	rules: readonly TagRule[],
	specs: Specs,
	options: Options,
	depth: number,
	mode: Mode,
): Result {
	const choiceLog = cmLog.extend(`choice#${depth}`);
	const collection = new Collection(childNodes);
	const unmatchedResults: Result[] = [];

	let i = 0;
	for (const some of pattern.choice) {
		choiceLog('Patterns[%s]: %s', i, modelLog(some, ''));

		const result = order(some, collection.unmatched, rules, specs, options, depth + 1, mode);

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

	const barelyMatchedResult = unmatchedResults.toSorted((a, b) => {
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

/**
 * Formats a debug log string for a choice pattern, highlighting the selected
 * branch index with a color (green for a full match, blue for a barely-matched fallback).
 *
 * @param choice - The array of choice branches from the pattern.
 * @param index - The index of the selected branch.
 * @param barely - Whether this is a barely-matched fallback (uses blue) or a full match (uses green).
 * @returns A formatted string showing all branches with the selected one highlighted.
 */
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
