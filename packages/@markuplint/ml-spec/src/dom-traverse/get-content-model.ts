import type { ElementSpec } from '../types';
import type { PermittedContentPattern } from '../types/permitted-structures';

import { getSpec } from './get-spec';

type Specs = Pick<ElementSpec, 'name' | 'contentModel'>[];

const cachesBySpecs = new Map<Specs, Map<Element, PermittedContentPattern[] | boolean | null>>();
export function getContentModel(el: Element, specs: Pick<ElementSpec, 'name' | 'contentModel'>[]) {
	const cacheByEl = cachesBySpecs.get(specs) ?? new Map<Element, PermittedContentPattern[] | boolean>();
	const cached = cacheByEl.get(el);
	if (cached) {
		return cached;
	}

	const spec = getSpec<'contentModel'>(el, specs);
	if (!spec) {
		cacheByEl.set(el, null);
		return null;
	}

	const conditions = spec.contentModel.conditional ?? [];
	for (const cond of conditions) {
		if (el.matches(cond.condition)) {
			cacheByEl.set(el, cond.contents);
			return cond.contents;
		}
	}

	cacheByEl.set(el, spec.contentModel.contents);
	return spec.contentModel.contents;
}
