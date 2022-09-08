import type { SelectorResult } from './matches-selector';
import type { ChildNode, Options, Specs } from './types';
import type { PermittedContentPattern, Model } from '@markuplint/ml-spec';

import { matchesSelector } from './matches-selector';
import { order } from './order';
import { Collection, isModel } from './utils';

export function recursiveBranch(
	model: Model | PermittedContentPattern[],
	nodes: readonly ChildNode[],
	specs: Specs,
	options: Options,
	depth: number,
): SelectorResult {
	if (!isModel(model)) {
		return order(model, nodes, specs, options, depth + 1);
	}

	if (typeof model === 'string') {
		return matchesSelector(model, nodes[0], specs, options, depth);
	}

	const collection = new Collection(nodes);

	let lastUnmatched: SelectorResult | null = null;
	for (const query of model) {
		const result = matchesSelector(query, collection.unmatched[0], specs, options, depth);
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
