import type { ContentModelResult, Element, Mode, Options, Specs, TagRule } from './types.js';
import type { ContentModel, MLMLSpec } from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

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
 * @param mode - Which identity to evaluate the element as (`'origin'` consults user
 *               rules keyed on the pre-pretender AST name; `'pretended'` uses the
 *               HTML spec for the pretender target).
 * @returns An array of content model results, one per child node issue found (empty if all valid).
 */
export function contentModel(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	rules: readonly TagRule[],
	options: Options,
	mode: Mode,
): ContentModelResult[] {
	const { model, specs } = createModel(el, rules, mode);
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
	const result = start(model, el, rules, specs, options, mode);

	return result;
}

/**
 * Builds the content model and merged specs for a given element.
 * Combines the element's document-level specs with any user-defined
 * tag rules, then resolves the content model for the current {@link Mode}.
 *
 * @param el - The element to look up the content model for.
 * @param rules - User-defined tag rules to merge into the spec.
 * @param mode - Which identity to resolve against.
 * @returns An object containing the resolved content model and merged specs.
 */
function createModel(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	rules: readonly TagRule[],
	mode: Mode,
) {
	const specs = cachedSpecs(el.ownerMLDocument.specs, rules);
	const model = resolveContentModel(el, rules, specs, mode);
	return {
		model,
		specs,
	};
}

/**
 * Resolves the content model for an element while honoring the current
 * {@link Mode}. In `'origin'` mode for a pretendered element, the lookup
 * first consults user-defined tag rules keyed on the element's original AST
 * name (`rawName`); if no such rule exists the returned model is `null`,
 * which signals the caller to skip validation for this mode. In all other
 * cases the standard spec lookup (`getContentModel`) is used, which keys on
 * the visible `localName` — i.e. the pretender target when pretending is
 * active.
 *
 * Exported so that {@link representTransparentNodes} can reuse the same
 * resolution logic when recursing into child content models.
 */
export function resolveContentModel(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	rules: readonly TagRule[],
	specs: Specs,
	mode: Mode,
): ReadonlyDeep<ContentModel['contents']> | null {
	if (mode === 'origin' && el.pretenderContext?.type === 'pretender') {
		const userRule = rules.find(r => r.tag === el.rawName);
		return userRule?.contents ?? null;
	}
	return getContentModel(el, specs.specs);
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
