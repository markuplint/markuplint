import type { ChildNode, Options, Result, Specs } from './types';

import { countPattern } from './count-pattern';
import { cmLog } from './debug';
import { Collection } from './utils';

const transparentLog = cmLog.extend('transparent');

export function transparent(nodes: ChildNode[], specs: Specs, options: Options, depth: number): Result {
	if (nodes.length === 0 || nodes[0].parentElement?.parentElement) {
		transparentLog('Skipped');
		return {
			type: nodes.length === 0 ? 'MATCHED_ZERO' : 'MATCHED',
			matched: nodes.slice(),
			unmatched: [],
			zeroMatch: nodes.length === 0,
			query: 'transparent',
			hint: {},
		};
	}

	transparentLog('Transparent model element is component root');

	const collection = new Collection(nodes);
	const result = countPattern({ zeroOrMore: ':model(flow)' }, collection.unmatched, specs, options, depth);
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
