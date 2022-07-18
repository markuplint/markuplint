import type { SelectorResult } from '../types';
import type { Category, MLMLSpec } from '@markuplint/ml-spec';

import { contentModelCategoryToTagNames } from '@markuplint/ml-spec';

import { createSelector } from '../create-selector';

export function contentModelPseudoClass(specs: MLMLSpec) {
	return (category: string) =>
		(el: Element): SelectorResult => {
			category = category.trim().toLowerCase();

			const selectors = contentModelCategoryToTagNames(`#${category}` as Category, specs.def);

			return {
				specificity: [0, 1, 0],
				matched: selectors.some(selector => {
					if (selector === '#custom') {
						// @ts-ignore
						return !!el.isCustomElement;
					}
					if (selector === '#text') {
						return false;
					}

					return createSelector(selector, specs).match(el);
				}),
			};
		};
}
