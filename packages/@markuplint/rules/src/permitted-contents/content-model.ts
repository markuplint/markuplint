import type { ContentModelResult, Element, Options, Specs, TagRule } from './types';
import type { MLMLSpec } from '@markuplint/ml-spec';

import { getContentModel } from '@markuplint/ml-spec';

import { start } from './start';

export function contentModel(el: Element, rules: TagRule[], options: Options): ContentModelResult[] {
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

function createModel(el: Element, rules: TagRule[]) {
	const specs = cachedSpecs(el.ownerMLDocument.specs, rules);
	const model = getContentModel(el, specs.specs);
	return model;
}

const caches = new Map<string, Specs>();
function cachedSpecs(specs: MLMLSpec, rules: TagRule[]): Specs {
	if (!rules.length) {
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
