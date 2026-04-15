import type { ChildNode, Mode, Options, Result, Specs, TagRule } from './types.js';
import type { PermittedContentPattern } from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

import { choice } from './choice.js';
import { countPattern } from './count-pattern.js';
import { transparent } from './transparent.js';
import { isChoice, isTransparent } from './utils.js';

/**
 * Dispatches a single content model pattern to the appropriate handler based on its type.
 * Acts as a routing layer in the content model validation pipeline:
 * - Choice patterns (alternation) are delegated to `choice`.
 * - Transparent patterns are delegated to `transparent`.
 * - All other quantified patterns (require, optional, oneOrMore, zeroOrMore) are delegated to `countPattern`.
 *
 * @param pattern - A single content model pattern to evaluate.
 * @param childNodes - The child nodes to validate against the pattern.
 * @param rules - User-defined tag rules. Threaded through for transparent-model recursion;
 *                not consulted here directly. See `order` for the rationale.
 * @param specs - The resolved spec data for content model lookups.
 * @param options - Validation behavior options.
 * @param depth - The current recursion depth, used for debug logging and nested evaluation.
 * @param mode - Whether we are evaluating the element's `'origin'` or `'pretended'` identity.
 * @returns A result indicating whether the child nodes match the pattern.
 */
export function complexBranch(
	pattern: ReadonlyDeep<PermittedContentPattern>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	childNodes: readonly ChildNode[],
	rules: readonly TagRule[],
	specs: Specs,
	options: Options,
	depth: number,
	mode: Mode,
): Result {
	if (isChoice(pattern)) {
		return choice(pattern, childNodes, rules, specs, options, depth, mode);
	}

	if (isTransparent(pattern)) {
		return transparent(childNodes);
	}

	return countPattern(pattern, childNodes, rules, specs, options, depth, mode);
}
