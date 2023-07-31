import type { MLMLSpec } from '@markuplint/ml-spec';

import { ariaPseudoClass } from './extended-selector/aria-pseudo-class.js';
import { ariaRolePseudoClass } from './extended-selector/aria-role-pseudo-class.js';
import { contentModelPseudoClass } from './extended-selector/content-model-pseudo-class.js';
import { Selector } from './selector.js';

const caches = new Map<string, Selector>();

export function createSelector(selector: string, specs?: MLMLSpec) {
	let instance = caches.get(selector);
	if (instance) {
		return instance;
	}

	instance = new Selector(
		selector,
		specs
			? {
					model: contentModelPseudoClass(specs),
					aria: ariaPseudoClass(),
					role: ariaRolePseudoClass(specs),
			  }
			: undefined,
	);
	caches.set(selector, instance);
	return instance;
}
