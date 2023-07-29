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
 * @param elements
 * @param specs
 * @param options
 * @param depth
 * @returns
 */
export function complexBranch(
	pattern: ReadonlyDeep<PermittedContentPattern>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	elements: readonly ChildNode[],
	specs: Specs,
	options: Options,
	depth: number,
): Result {
	if (isChoice(pattern)) {
		return choice(pattern, elements, specs, options, depth);
	}

	if (isTransparent(pattern)) {
		return transparent(elements);
	}

	return countPattern(pattern, elements, specs, options, depth);
}
