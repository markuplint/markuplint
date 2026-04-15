import type { SelectorResult } from './matches-selector.js';
import type { ChildNode, Mode, Options, Specs, TagRule } from './types.js';
import type { PermittedContentPattern, Model } from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

import { matchesSelector } from './matches-selector.js';
import { order } from './order.js';
import { Collection, isModel } from './utils.js';

/**
 * Evaluates a model or nested pattern array against child nodes at the leaf level
 * of the content model tree. If the input is a nested pattern array (not a terminal model),
 * it recurses back into `order` for sequential evaluation. If it is a terminal model
 * (a single selector string or an array of selector strings representing alternatives),
 * it tests the first unmatched child node against each selector via `matchesSelector`.
 *
 * For array-of-selectors models, the selectors act as alternatives (logical OR): the first
 * selector to match the child node produces the result.
 *
 * @param model - Either a terminal model (selector string or array of selector strings) or a nested pattern array.
 * @param childNodes - The child nodes to validate against the model.
 * @param specs - The resolved spec data for content model lookups.
 * @param options - Validation behavior options.
 * @param depth - The current recursion depth, used for debug logging and nested evaluation.
 * @returns A selector result indicating whether the first unmatched child node matches the model.
 */
export function recursiveBranch(
	model: ReadonlyDeep<Model | PermittedContentPattern[]>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	childNodes: readonly ChildNode[],
	rules: readonly TagRule[],
	specs: Specs,
	options: Options,
	depth: number,
	mode: Mode,
): SelectorResult {
	if (!isModel(model)) {
		return order(model, childNodes, rules, specs, options, depth + 1, mode);
	}

	if (typeof model === 'string') {
		return matchesSelector(model, childNodes[0], specs, depth, mode);
	}

	const collection = new Collection(childNodes);

	let lastUnmatched: SelectorResult | null = null;
	for (const query of model) {
		const result = matchesSelector(query, collection.unmatched[0], specs, depth, mode);
		collection.addMatched(result.matched);

		if (result.type === 'MATCHED' || result.type === 'MATCHED_ZERO') {
			return {
				type: result.type,
				matched: collection.matched,
				unmatched: collection.unmatched,
				zeroMatch: result.zeroMatch,
				query: result.query,
				hint: result.hint,
			};
		}
		lastUnmatched = {
			type: result.type,
			matched: collection.matched,
			unmatched: collection.unmatched,
			zeroMatch: result.zeroMatch,
			query: result.query,
			hint: result.hint,
		};
	}

	if (!lastUnmatched) {
		throw new Error('Unreachable code');
	}

	return lastUnmatched;
}
