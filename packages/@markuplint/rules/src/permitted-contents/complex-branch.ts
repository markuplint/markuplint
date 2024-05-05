import type { ChildNode, Options, Result, Specs } from './types.js';
import type { PermittedContentPattern } from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

import { choice } from './choice.js';
import { countPattern } from './count-pattern.js';
import { transparent } from './transparent.js';
import { isChoice, isTransparent } from './utils.js';

/**
 * Check content condition
 *
 * @param pattern
 * @param childNodes
 * @param specs
 * @param options
 * @param depth
 * @returns
 */
export function complexBranch(
	pattern: ReadonlyDeep<PermittedContentPattern>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	childNodes: readonly ChildNode[],
	specs: Specs,
	options: Options,
	depth: number,
): Result {
	if (isChoice(pattern)) {
		return choice(pattern, childNodes, specs, options, depth);
	}

	if (isTransparent(pattern)) {
		return transparent(childNodes);
	}

	return countPattern(pattern, childNodes, specs, options, depth);
}
