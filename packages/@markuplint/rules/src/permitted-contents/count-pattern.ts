import type { ChildNode, Mode, Options, Result, Specs, TagRule } from './types.js';
import type {
	PermittedContentOneOrMore,
	PermittedContentOptional,
	PermittedContentRequire,
	PermittedContentZeroOrMore,
} from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

import { cmLog } from './debug.js';
import { recursiveBranch } from './recursive-branch.js';
import { Collection, mergeHints, modelLog, normalizeModel } from './utils.js';

const cLog = cmLog.extend('countCompereResult');

/**
 * Validates a quantified content model pattern (require, optional, oneOrMore, or zeroOrMore)
 * against a list of child nodes. Repeatedly applies the inner pattern via `recursiveBranch`
 * until the minimum count is satisfied and no more nodes match, or until the maximum count
 * is exceeded.
 *
 * Implements the repetition/quantifier semantics of content models (e.g., "one or more
 * flow content elements", "optionally a `<caption>`", "exactly one `<tbody>`").
 *
 * @param pattern - A quantified content model pattern (require, optional, oneOrMore, or zeroOrMore).
 * @param childNodes - The child nodes to validate against the repeated pattern.
 * @param specs - The resolved spec data for content model lookups.
 * @param options - Validation behavior options.
 * @param depth - The current recursion depth, used for debug logging and nested evaluation.
 * @returns A result indicating whether the required count of matches was achieved.
 */
export function countPattern(
	pattern:
		| ReadonlyDeep<PermittedContentOneOrMore>
		| ReadonlyDeep<PermittedContentOptional>
		| ReadonlyDeep<PermittedContentRequire>
		| ReadonlyDeep<PermittedContentZeroOrMore>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	childNodes: readonly ChildNode[],
	rules: readonly TagRule[],
	specs: Specs,
	options: Options,
	depth: number,
	mode: Mode,
): Result {
	const ptLog = cmLog.extend(`countPattern#${depth}`);
	const collection = new Collection(childNodes);

	const { model, min, max, repeat, missingType } = normalizeModel(pattern);

	ptLog('Model:\n  RegEx: %s\n  Schema: %o', modelLog(model, repeat), pattern);

	let prevResult: Result | null = null;
	let barelyResult: Result | null = null;
	let loopCount = 0;

	while (true) {
		loopCount++;
		ptLog('Check#%s: %s', loopCount, collection);
		const result = recursiveBranch(model, collection.unmatched, rules, specs, options, depth, mode);
		const added = collection.addMatched(result.matched);
		const { matchedCount } = collection;

		if (result.type === 'UNMATCHED_SELECTOR_BUT_MAY_EMPTY') {
			ptLog(
				'MATCHED_ZERO:\n  model: %s\n  max: %s\n  collection: %s\n  matched element: %s',
				modelLog(model, repeat),
				max,
				collection,
				matchedCount,
			);

			return compereResult(
				{
					type: 'MATCHED_ZERO',
					matched: collection.matched,
					unmatched: collection.unmatched,
					zeroMatch: true,
					query: result.query,
					hint: result.hint,
				},
				barelyResult,
			);
		}

		if (max < collection.matchedCount) {
			collection.max(max);
			ptLog(
				'UNEXPECTED_EXTRA_NODE:\n  model: %s\n  max: %s\n  collection: %s\n  matched element: %s',
				modelLog(model, repeat),
				max,
				collection,
				matchedCount,
			);
			return compereResult(
				{
					type: 'UNEXPECTED_EXTRA_NODE',
					matched: collection.matched,
					unmatched: collection.unmatched,
					zeroMatch: result.zeroMatch,
					query: result.query,
					hint: mergeHints(result.hint, { max }),
				},
				barelyResult,
			);
		}

		if (prevResult) {
			if (
				result.type === 'MISSING_NODE_ONE_OR_MORE' ||
				result.type === 'MISSING_NODE_REQUIRED' ||
				result.type === 'TRANSPARENT_MODEL_DISALLOWS'
			) {
				ptLog('%s(continued): %s; Needs', result.type, collection, result.query);
				return compereResult(
					{
						type: result.type,
						matched: collection.matched,
						unmatched: collection.unmatched,
						zeroMatch: result.zeroMatch,
						query: result.query,
						hint: result.hint,
					},
					barelyResult,
				);
			}

			ptLog('%s(continued): %s', prevResult.type, collection);
			return compereResult(prevResult, barelyResult);
		}

		if (added && collection.unmatched.length > 0) {
			if (result.type !== 'MISSING_NODE' && result.type !== 'UNMATCHED_SELECTORS') {
				barelyResult = {
					type: result.type,
					matched: collection.matched,
					unmatched: collection.unmatched,
					zeroMatch: result.zeroMatch,
					query: result.query,
					hint: result.hint,
				};
			}
			ptLog('continue⤴️');
			continue;
		}

		if (collection.matchedCount + (result.zeroMatch ? 1 : 0) < min) {
			const resultType =
				result.type === 'MISSING_NODE_REQUIRED' ||
				result.type === 'MISSING_NODE_ONE_OR_MORE' ||
				result.type === 'TRANSPARENT_MODEL_DISALLOWS'
					? result.type
					: (missingType ?? 'MISSING_NODE_REQUIRED');

			ptLog('%s(in %s); Needs %s', resultType, missingType, result.query);

			return compereResult(
				{
					type: resultType,
					matched: collection.matched,
					unmatched: collection.unmatched,
					zeroMatch: result.zeroMatch,
					query: result.query,
					hint: mergeHints(result.hint, {
						missing: {
							barelyMatchedElements: collection.matched.length,
							need: result.query,
						},
					}),
				},
				barelyResult,
			);
		}

		const resultType = collection.matched.length === 0 ? 'MATCHED_ZERO' : 'MATCHED';
		const zeroMatch = result.zeroMatch || min === 0 || resultType === 'MATCHED_ZERO';

		const matchedResult: Result = {
			type: resultType,
			matched: collection.matched,
			unmatched: collection.unmatched,
			zeroMatch,
			query: result.query,
			hint: mergeHints(result.hint, {
				missing: {
					barelyMatchedElements: collection.matched.length,
					need: result.query,
				},
			}),
		};

		if (collection.unmatched.length > 0) {
			prevResult = matchedResult;
			ptLog('continue⤴️ (add prev)');
			continue;
		}

		ptLog(
			'%s:\n  model: %s\n  max: %s\n  collection: %s\n  matched element: %s',
			resultType,
			modelLog(model, repeat),
			max,
			collection,
			matchedCount,
		);

		// When min=0 and no elements were consumed, the pattern legitimately
		// matched zero times — don't propagate the inner sequence's failure.
		// This enables zeroOrMore([oneOrMore dt, oneOrMore dd]) to accept
		// empty content (e.g., <dl></dl>). See #3592.
		if (
			(collection.matchedCount > 0 || min > 0) &&
			(result.type === 'MISSING_NODE_REQUIRED' ||
				result.type === 'MISSING_NODE_ONE_OR_MORE' ||
				result.type === 'TRANSPARENT_MODEL_DISALLOWS')
		) {
			return compereResult(
				{
					type: result.type,
					matched: collection.matched,
					unmatched: collection.unmatched,
					zeroMatch: result.zeroMatch,
					query: result.query,
					hint: result.hint,
				},
				barelyResult,
			);
		}

		return compereResult(matchedResult, barelyResult);
	}
}

/**
 * Compares two results and returns the one that represents the best diagnostic outcome.
 * When the primary result is a match or an unexpected-extra-node, it is preferred.
 * Otherwise, the result with more barely-matched elements (closer to success) is chosen
 * to provide the most helpful error message.
 *
 * @param a - The primary (current iteration) result.
 * @param b - The barely-matched result from a previous successful partial match, or null.
 * @returns The result that should be reported to the user.
 */
function compereResult(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	a: Readonly<Result>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	b: Readonly<Result> | null,
): Result {
	cLog('current: %s %O\nbarely: %s %O', a.type, a.hint, b?.type, b?.hint);

	if (b == null) {
		return a;
	}

	if (a.type === 'MATCHED' || a.type === 'MATCHED_ZERO' || a.type === 'UNEXPECTED_EXTRA_NODE') {
		return a;
	}

	const result =
		[a, b].toSorted(
			(a, b) => (b.hint.missing?.barelyMatchedElements ?? 0) - (a.hint.missing?.barelyMatchedElements ?? 0),
		)[0] ?? a;

	return result;
}
