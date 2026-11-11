import type { SelectorElement, SelectorMatchedResult, SelectorResult } from '../types.js';
import type { Category, MLMLSpec } from '@markuplint/ml-spec';

import { contentModelCategoryToTagNames } from '@markuplint/ml-spec';

import { contentModelFirstChildBase, isContentModelFirstChild } from '../content-model-first-child.js';
import { createSelector } from '../create-selector.js';
import { InvalidSelectorError } from '../invalid-selector-error.js';

/**
 * Reads the category of `:model()` when the selector is created, so that a category the
 * specification does not define (a typo, which matches no element at all) is the fault of the
 * selector. The names of the categories are those of `#contentModels` of the specification,
 * compared as ASCII case-insensitive text, as {@link contentModelCategoryToTagNames} does.
 *
 * @param specs - The specification that defines the categories, or `null` when the selector is created
 * without one (the check of a configuration): only an empty category is found then
 * @param category - What is written in the parentheses
 * @returns The category as the matcher reads it
 * @throws {InvalidSelectorError} When the category is empty, or `specs` does not define it
 */
export function readContentModelCategory(specs: MLMLSpec | null, category: string) {
	const name = category.trim().toLowerCase();
	const selector = `:model(${category})`;
	if (!name) {
		throw new InvalidSelectorError(selector, 'The content model category is empty');
	}
	if (specs) {
		const categories = specs.def['#contentModels'];
		// The exact key answers for the lower-case categories; the scan is for the mixed-case ones (`#SVGShape`)
		if (!(`#${name}` in categories) && !Object.keys(categories).some(key => key.toLowerCase() === `#${name}`)) {
			throw new InvalidSelectorError(selector, `Unknown content model category: ${category.trim()}`);
		}
	}
	return name;
}

export function contentModelPseudoClass(specs: MLMLSpec) {
	return (rawCategory: string) => {
		const category = readContentModelCategory(specs, rawCategory);
		return (
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			el: SelectorElement,
		): SelectorResult => {
			const selectors = contentModelCategoryToTagNames(`#${category}` as Category, specs.def);
			const matched = selectors
				.flatMap<SelectorResult>(selector => {
					// `#custom` is decided by the host element (`SelectorElement.isCustomElement`),
					// as the selector package has no notion of element types.
					if (selector === '#custom') {
						if (el.isCustomElement) {
							return [
								{
									specificity: [0, 1, 0],
									matched: true,
									nodes: [el],
									has: [],
								},
							];
						}
						return [
							{
								specificity: [0, 1, 0],
								matched: false,
							},
						];
					}
					// `#text` can never match: the selector engine only
					// evaluates elements, never text nodes.
					if (selector === '#text') {
						return [
							{
								specificity: [0, 1, 0],
								matched: false,
							},
						];
					}

					// `style:first-child`: the first child as the HTML Standard counts it
					const firstChildBase = contentModelFirstChildBase(selector);
					if (firstChildBase != null) {
						const results = createSelector(firstChildBase, specs).search(el);
						// The siblings are walked only for an element that matches the rest
						if (results.some(r => r.matched) && !isContentModelFirstChild(el)) {
							return [
								{
									specificity: [0, 1, 0],
									matched: false,
								},
							];
						}
						return results;
					}

					return createSelector(selector, specs).search(el);
				})
				.filter((m): m is SelectorMatchedResult => m.matched);

			if (matched.length > 0) {
				return {
					specificity: [0, 1, 0],
					matched: true,
					nodes: matched.flatMap(m => (m.matched ? m.nodes : [])),
					has: matched.flatMap(m => (m.matched ? m.has : [])),
				};
			}

			return {
				specificity: [0, 1, 0],
				matched: false,
			};
		};
	};
}
