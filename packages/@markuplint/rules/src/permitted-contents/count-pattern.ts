import type { ChildNode, Options, Result, Specs } from './types.js';
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
 * Check count
 *
 * @param pattern
 * @param childNodes
 * @param specs
 * @param options
 * @param depth
 * @returns
 */
export function countPattern(
	pattern:
		| ReadonlyDeep<PermittedContentOneOrMore>
		| ReadonlyDeep<PermittedContentOptional>
		| ReadonlyDeep<PermittedContentRequire>
		| ReadonlyDeep<PermittedContentZeroOrMore>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	childNodes: readonly ChildNode[],
	specs: Specs,
	options: Options,
	depth: number,
): Result {
	const ptLog = cmLog.extend(`countPattern#${depth}`);
	const collection = new Collection(childNodes);

	const { model, min, max, repeat, missingType } = normalizeModel(pattern);

	ptLog('Model:\n  RegEx: %s\n  Schema: %o', modelLog(model, repeat), pattern);

	let prevResult: Result | null = null;
	let barelyResult: Result | null = null;
	let loopCount = 0;

	// eslint-disable-next-line no-constant-condition
	while (true) {
		loopCount++;
		ptLog('Check#%s: %s', loopCount, collection);
		const result = recursiveBranch(model, collection.unmatched, specs, options, depth);
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

		if (
			result.type === 'MISSING_NODE_REQUIRED' ||
			result.type === 'MISSING_NODE_ONE_OR_MORE' ||
			result.type === 'TRANSPARENT_MODEL_DISALLOWS'
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
		[a, b].sort(
			(a, b) => (b.hint.missing?.barelyMatchedElements ?? 0) - (a.hint.missing?.barelyMatchedElements ?? 0),
		)[0] ?? a;

	return result;
}
