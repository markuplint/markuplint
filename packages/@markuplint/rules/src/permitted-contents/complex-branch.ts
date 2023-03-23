import type { ChildNode, Options, Result, Specs } from './types';
import type { PermittedContentPattern } from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

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
	pattern: ReadonlyDeep<PermittedContentPattern>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	elements: readonly ChildNode[],
	specs: ReadonlyDeep<Specs>,
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
