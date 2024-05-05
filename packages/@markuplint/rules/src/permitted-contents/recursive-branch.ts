import type { SelectorResult } from './matches-selector.js';
import type { ChildNode, Options, Specs } from './types.js';
import type { PermittedContentPattern, Model } from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

import { matchesSelector } from './matches-selector.js';
import { order } from './order.js';
import { Collection, isModel } from './utils.js';

export function recursiveBranch(
	model: ReadonlyDeep<Model | PermittedContentPattern[]>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	childNodes: readonly ChildNode[],
	specs: Specs,
	options: Options,
	depth: number,
): SelectorResult {
	if (!isModel(model)) {
		return order(model, childNodes, specs, options, depth + 1);
	}

	if (typeof model === 'string') {
		return matchesSelector(model, childNodes[0], specs, depth);
	}

	const collection = new Collection(childNodes);

	let lastUnmatched: SelectorResult | null = null;
	for (const query of model) {
		const result = matchesSelector(query, collection.unmatched[0], specs, depth);
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
