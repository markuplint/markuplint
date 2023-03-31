import type { ContentModelResult, Element, Options, Specs, TagRule } from './types';
import type { MLMLSpec } from '@markuplint/ml-spec';

import { getContentModel } from '@markuplint/ml-spec';

import { start } from './start';

export function contentModel(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	rules: readonly TagRule[],
	options: Options,
): ContentModelResult[] {
	const model = createModel(el, rules);
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
	const result = start(model, el, el.ownerMLDocument.specs, options);

	return result;
}

function createModel(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	rules: readonly TagRule[],
) {
	const specs = cachedSpecs(el.ownerMLDocument.specs, rules);
	const model = getContentModel(el, specs.specs);
	return model;
}

const caches = new Map<string, Specs>();
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
