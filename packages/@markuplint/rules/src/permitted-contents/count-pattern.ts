import type { ChildNode, Options, Result, Specs } from './types';
import type {
	PermittedContentOneOrMore,
	PermittedContentOptional,
	PermittedContentRequire,
	PermittedContentZeroOrMore,
} from '@markuplint/ml-spec';

import { cmLog } from './debug';
import { recursiveBranch } from './recursive-branch';
import { Collection, modelLog, normalizeModel } from './utils';

/**
 * Check count
 *
 * @param pattern
 * @param elements
 * @param specs
 * @param options
 * @param depth
 * @returns
 */
export function countPattern(
	pattern:
		| PermittedContentOneOrMore
		| PermittedContentOptional
		| PermittedContentRequire
		| PermittedContentZeroOrMore,
	elements: readonly ChildNode[],
	specs: Specs,
	options: Options,
	depth: number,
): Result {
	const ptLog = cmLog.extend(`countPattern#${depth}`);
	const collection = new Collection(elements);

	const { model, min, max, repeat, missingType } = normalizeModel(pattern);

	ptLog('Model:\n  RegEx: %s\n  Schema: %o', modelLog(model, repeat), pattern);

	let prevResult: Result | null = null;
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

			return {
				type: 'MATCHED_ZERO',
				matched: collection.matched,
				unmatched: collection.unmatched,
				zeroMatch: true,
				query: result.query,
				hint: result.hint,
			};
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

			return {
				type: 'UNEXPECTED_EXTRA_NODE',
				matched: collection.matched,
				unmatched: collection.unmatched,
				zeroMatch: result.zeroMatch,
				query: result.query,
				hint: {
					...result.hint,
					max,
				},
			};
		}

		if (prevResult) {
			if (
				result.type === 'MISSING_NODE_ONE_OR_MORE' ||
				result.type === 'MISSING_NODE_REQUIRED' ||
				result.type === 'TRANSPARENT_MODEL_DISALLOWS'
			) {
				ptLog('%s(continued): %s; Needs', result.type, collection, result.query);
				return {
					type: result.type,
					matched: collection.matched,
					unmatched: collection.unmatched,
					zeroMatch: result.zeroMatch,
					query: result.query,
					hint: result.hint,
				};
			}

			ptLog('%s(continued): %s', prevResult.type, collection);
			return prevResult;
		}

		if (added && collection.unmatched.length > 0) {
			ptLog('continue⤴️');
			continue;
		}

		if (collection.matchedCount + (result.zeroMatch ? 1 : 0) < min) {
			const resultType =
				result.type === 'MISSING_NODE_REQUIRED' ||
				result.type === 'MISSING_NODE_ONE_OR_MORE' ||
				result.type === 'TRANSPARENT_MODEL_DISALLOWS'
					? result.type
					: missingType ?? 'MISSING_NODE_REQUIRED';

			ptLog('%s(in %s); Needs %s', resultType, missingType, result.query);

			return {
				type: resultType,
				matched: collection.matched,
				unmatched: collection.unmatched,
				zeroMatch: result.zeroMatch,
				query: result.query,
				hint: result.hint,
			};
		}

		const resultType = collection.matched.length === 0 ? 'MATCHED_ZERO' : 'MATCHED';
		const zeroMatch = result.zeroMatch || min === 0 || resultType === 'MATCHED_ZERO';

		const matchedResult: Result = {
			type: resultType,
			matched: collection.matched,
			unmatched: collection.unmatched,
			zeroMatch,
			query: result.query,
			hint: result.hint,
		};

		if (!prevResult && collection.unmatched.length) {
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
			return {
				type: result.type,
				matched: collection.matched,
				unmatched: collection.unmatched,
				zeroMatch: result.zeroMatch,
				query: result.query,
				hint: result.hint,
			};
		}

		return matchedResult;
	}
}
