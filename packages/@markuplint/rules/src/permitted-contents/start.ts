import type { ContentModelResult, Element, Mode, Options, Specs, TagRule } from './types.js';
import type { ContentModel } from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

import { order } from './order.js';
import { representTransparentNodes } from './represent-transparent-nodes.js';

/**
 * Entry point for validating an element's child nodes against a content model definition.
 * Handles the three forms of content model: `false` (no content allowed), `true` (any content
 * allowed), or an ordered pattern array. For pattern arrays, transparent content model nodes
 * are first resolved, then each resulting pattern of child nodes is validated via `order`.
 *
 * When `options.evaluateConditionalChildNodes` is enabled, all conditional branches
 * (e.g., from template directives) are evaluated independently.
 *
 * @param contents - The content model definition: `false` for empty, `true` for any, or an array of patterns.
 * @param el - The parent element whose children are being validated.
 * @param specs - The resolved spec data for content model lookups.
 * @param options - Validation behavior options.
 * @returns An array of content model results describing any violations found.
 */
export function start(
	contents: ReadonlyDeep<ContentModel['contents']>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	rules: readonly TagRule[],
	specs: Specs,
	options: Options,
	mode: Mode,
): ContentModelResult[] {
	const childNodesPatterns = options.evaluateConditionalChildNodes
		? el.conditionalChildNodes().map(childNodes => [...childNodes])
		: [[...el.childNodes].filter(child => !(child.is(child.TEXT_NODE) && child.isWhitespace()))];

	return childNodesPatterns.flatMap<ContentModelResult>(childNodes => {
		if (contents === false) {
			if (childNodes.length > 0) {
				return [
					{
						type: 'NOTHING',
						scope: el,
						query: ':not(*)',
						hint: {},
					},
				];
			}
			return [
				{
					type: 'MATCHED',
					scope: el,
					query: '*',
					hint: {},
				},
			];
		}
		if (contents === true) {
			// Allows all elements
			return [
				{
					type: 'MATCHED',
					scope: el,
					query: '*',
					hint: {},
				},
			];
		}

		const patterns = representTransparentNodes(childNodes, rules, specs, options, mode);

		return patterns.flatMap(({ nodes, errors }) => {
			const result = order(contents, nodes, rules, specs, options, 0, mode);

			return [
				{
					type: result.type,
					scope:
						result.type === 'MISSING_NODE_REQUIRED' || result.type === 'MISSING_NODE_ONE_OR_MORE'
							? el
							: (result.unmatched[0] ?? el),
					query: result.query,
					hint: result.hint,
				},
				...errors.map(error => ({
					type: error.type,
					scope: error.unmatched[0] ?? el,
					query: error.query,
					hint: error.hint,
				})),
			];
		});
	});
}
