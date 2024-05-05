import type { ChildNode, Result } from './types.js';

import { cmLog } from './debug.js';

const transparentLog = cmLog.extend('transparent');

export function transparent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	childNodes: readonly ChildNode[],
): Result {
	if (childNodes.length === 0 || childNodes[0]?.parentElement?.parentElement) {
		transparentLog('Skipped');
		return {
			type: childNodes.length === 0 ? 'MATCHED_ZERO' : 'MATCHED',
			matched: [...childNodes],
			unmatched: [],
			zeroMatch: childNodes.length === 0,
			query: 'transparent',
			hint: {},
		};
	}

	transparentLog('Transparent model element is component root');

	return {
		type: 'MATCHED',
		matched: [...childNodes],
		unmatched: [],
		zeroMatch: false,
		query: 'transparent',
		hint: {},
	};
}
