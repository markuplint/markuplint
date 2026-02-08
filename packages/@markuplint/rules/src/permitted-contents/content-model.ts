import type { ContentModelResult, Element, Options, Specs, TagRule } from './types.js';
import type { MLMLSpec } from '@markuplint/ml-spec';

import { getContentModel } from '@markuplint/ml-spec';

import { start } from './start.js';

/**
 * Top-level entry point for content model validation of a single element.
 * Resolves the element's content model from the spec (possibly augmented
 * by user-defined tag rules), then delegates to `start` to validate
 * the element's child nodes against that model.
 *
 * @param el - The element whose children are to be validated against its content model.
 * @param rules - User-defined tag rules that can override or extend built-in content models.
 * @param options - Validation behavior options (e.g., whether to ignore mutable children).
 * @returns An array of content model results, one per child node issue found (empty if all valid).
 */
export function contentModel(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	rules: readonly TagRule[],
	options: Options,
): ContentModelResult[] {
	const { model, specs } = createModel(el, rules);
	if (model == null) {
		return [
			{
				type: 'MATCHED',
				scope: el,
				query: '*',
				hint: {},
			},
		];
	}
	const result = start(model, el, specs, options);

	return result;
}

/**
 * Builds the content model and merged specs for a given element.
 * Combines the element's document-level specs with any user-defined
 * tag rules, then looks up the content model for the element.
 *
 * @param el - The element to look up the content model for.
 * @param rules - User-defined tag rules to merge into the spec.
 * @returns An object containing the resolved content model and merged specs.
 */
function createModel(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	rules: readonly TagRule[],
) {
	const specs = cachedSpecs(el.ownerMLDocument.specs, rules);
	const model = getContentModel(el, specs.specs);
	return {
		model,
		specs,
	};
}

/**
 * Cache for merged specs keyed by the JSON-serialized tag rules.
 * Avoids re-merging the same set of user-defined tag rules on every element check.
 */
const caches = new Map<string, Specs>();

/**
 * Returns a Specs object that merges the base ML spec with user-defined
 * tag rules. Results are cached by the serialized rules to avoid redundant merging.
 *
 * @param specs - The base ML spec from the document.
 * @param rules - User-defined tag rules to merge.
 * @returns The merged Specs, either from cache or freshly computed.
 */
function cachedSpecs(specs: MLMLSpec, rules: readonly TagRule[]): Specs {
	if (rules.length === 0) {
		return specs;
	}

	const key = JSON.stringify(rules);

	const cached = caches.get(key);
	if (cached) {
		return cached;
	}

	const merged: Specs = {
		...specs,
		specs: [
			...specs.specs,
			...rules.map(tag => ({
				name: tag.tag,
				contentModel: tag,
			})),
		],
	};

	caches.set(key, merged);

	return merged;
}
