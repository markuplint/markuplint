import type { ElementSpec } from '../types';

import { getSpec } from './get-spec';

export function getContentModel(el: Element, specs: Pick<ElementSpec, 'name' | 'contentModel'>[]) {
	const spec = getSpec<'contentModel'>(el, specs);
	if (!spec) {
		return null;
	}

	const conditions = spec.contentModel.conditional ?? [];
	for (const cond of conditions) {
		if (el.matches(cond.condition)) {
			return cond.contents;
		}
	}
	return spec.contentModel.contents;
}
