import type { ChildNode, ContentModelResult, Element, Mode, Options, Specs, TagRule } from './types.js';
import type { ContentModel } from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

import { isInterElementWhitespace } from '@markuplint/selector';

import { order } from './order.js';
import { representTransparentNodes } from './represent-transparent-nodes.js';
import { expandChildren } from './slot-content.js';
import { isComment } from './utils.js';

/**
 * Entry point for validating an element's child nodes against a content model definition.
 * Handles the three forms of content model: `false` (no content allowed), `true` (any content
 * allowed), or an ordered pattern array. For pattern arrays, transparent content model nodes
 * are first resolved, then each resulting pattern of child nodes is validated via `order`.
 *
 * When `options.evaluateConditionalChildNodes` is enabled, all conditional branches
 * (e.g., from template directives) are evaluated independently.
 *
 * A component that no pretender resolved (`MLElement#isUnresolvedComponent`) renders something that is
 * not known: it may be the element that the content model asks for, or stand for several. With
 * `ignoreUnresolvedComponents` the children are evaluated without such components, and only what holds
 * whatever they render is kept ({@link holdsWhateverIsRendered}). Without it they are evaluated as
 * written, by the name of the component (`isTreatedAsCustom` of `matches-selector.ts`).
 *
 * @param contents - The content model definition: `false` for empty, `true` for any, or an array of patterns.
 * @param el - The parent element whose children are being validated.
 * @param specs - The resolved spec data for content model lookups.
 * @param options - Validation behavior options.
 * @param ignoreUnresolvedComponents - Whether to evaluate the children without the components that no pretender resolved.
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
	ignoreUnresolvedComponents = false,
): ContentModelResult[] {
	const givenPatterns = options.evaluateConditionalChildNodes
		? el.conditionalChildNodes().map(childNodes => [...childNodes])
		: [[...el.childNodes]];
	// A model that is `false` does not allow a component either: what it renders may be anything
	const ignoresComponents = ignoreUnresolvedComponents && contents !== false && contents !== true;
	const isIgnoredComponent = (child: ChildNode) =>
		ignoresComponents && child.is(child.ELEMENT_NODE) && child.isUnresolvedComponent();
	const expandedPatterns = givenPatterns.map(given => expandChildren(el, given, mode));
	// Per pattern: a conditional branch without a component is evaluated as it is written
	const hasIgnoredComponents = expandedPatterns.map(expanded => expanded.some(child => isIgnoredComponent(child)));
	const childNodesPatterns = expandedPatterns.map(expanded => {
		const children = expanded.filter(child => !isComment(child) && !isIgnoredComponent(child));
		return options.evaluateConditionalChildNodes
			? [...children]
			: children.filter(child => !(child.is(child.TEXT_NODE) && isInterElementWhitespace(child.raw)));
	});

	return childNodesPatterns.flatMap<ContentModelResult>((childNodes, index) => {
		const results = evaluate(childNodes);
		return hasIgnoredComponents[index] ? results.filter(result => holdsWhateverIsRendered(result)) : results;
	});

	function evaluate(childNodes: readonly ChildNode[]): ContentModelResult[] {
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
	}
}

/**
 * Whether a violation found without the components that no pretender resolved holds whatever
 * they render.
 *
 * A component may render the child that is missing, so a missing child is not one. An element
 * that the content model does not take is (`<div>` in `<ul><Item /><div></div></ul>`, the second
 * `<title>` in `<head><Meta /><title /><title /></head>`): `order` reports it only after it has
 * consumed every entry that it can, and a component adds nodes without moving or removing the ones
 * that are written. The order is not reported either: when the elements are out of order the
 * entry that comes first is missing, which a component may render (`<dl><Term /><dd></dd></dl>`).
 */
function holdsWhateverIsRendered(result: ContentModelResult): boolean {
	return result.type !== 'MISSING_NODE_REQUIRED' && result.type !== 'MISSING_NODE_ONE_OR_MORE';
}
