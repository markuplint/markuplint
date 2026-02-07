import type { ChildNode, Result } from './types.js';

import { cmLog } from './debug.js';

const transparentLog = cmLog.extend('transparent');

/**
 * Handles the transparent content model pattern by passing all child nodes
 * through as matched. In HTML, a transparent element inherits the content model
 * of its parent, so its children are validated against the parent's model instead.
 *
 * If the element is a component root (has no grandparent element), all children
 * are treated as matched. Otherwise, validation is deferred to the parent's
 * content model processing.
 *
 * @param childNodes - The child nodes to evaluate under the transparent model.
 * @returns A result indicating all children are matched (validation deferred to parent).
 */
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
