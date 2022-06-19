import type { MLMLSpec } from '@markuplint/ml-spec';

import { ariaPseudoClass } from './extended-selector/aria-pseudo-class';
import { Selector } from './selector';

const caches = new Map<string, Selector>();

export function createSelector(selector: string, specs: MLMLSpec) {
	let instance = caches.get(selector);
	if (instance) {
		return instance;
	}

	instance = new Selector(selector, {
		aria: ariaPseudoClass(specs),
	});
	caches.set(selector, instance);
	return instance;
}
