import type { ChildNode, Options, Result, Specs } from './types';
import type { PermittedContentPattern } from '@markuplint/ml-spec';

import { choice } from './choice';
import { countPattern } from './count-pattern';
import { transparent } from './transparent';
import { isChoice, isTransparent } from './utils';

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
	pattern: PermittedContentPattern,
	elements: ChildNode[],
	specs: Specs,
	options: Options,
	depth: number,
): Result {
	if (isChoice(pattern)) {
		return choice(pattern, elements, specs, options, depth);
	}

	if (isTransparent(pattern)) {
		return transparent(elements, specs, options, depth);
	}

	return countPattern(pattern, elements, specs, options, depth);
}
