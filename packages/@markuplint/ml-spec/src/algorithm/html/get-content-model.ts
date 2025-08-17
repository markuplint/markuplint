import type { ElementSpec } from '../../types/index.js';
import type { PermittedContentPattern } from '../../types/permitted-structures.js';
import type { ReadonlyDeep } from 'type-fest';

import { getSpec } from '../../utils/get-spec.js';

type Specs = readonly Pick<ElementSpec, 'name' | 'contentModel'>[];

const cachesBySpecs = new Map<Specs, Map<Element, ReadonlyDeep<PermittedContentPattern[]> | boolean | null>>();

export function getContentModel(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: Specs,
) {
	const cacheByEl = cachesBySpecs.get(specs) ?? new Map<Element, PermittedContentPattern[] | boolean>();
	const cached = cacheByEl.get(el);
	if (cached !== undefined) {
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
