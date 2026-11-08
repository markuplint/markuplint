import type { MLMLSpec } from '@markuplint/ml-spec';

import { ariaPseudoClass } from './extended-selector/aria-pseudo-class.js';
import { ariaRolePseudoClass } from './extended-selector/aria-role-pseudo-class.js';
import { contentModelPseudoClass } from './extended-selector/content-model-pseudo-class.js';
import { displaySizePseudoClass } from './extended-selector/display-size-pseudo-class.js';
import { Selector } from './selector.js';

const caches = new Map<string, Selector>();

/**
 * Creates a cached {@link Selector} instance for the given CSS selector string.
 *
 * Results are cached by selector string so subsequent calls with the same
 * selector return the same instance.
 *
 * `:display-size()` is always available. When `specs` is provided, markuplint's
 * other extended pseudo-classes (`:model()`, `:aria()`, `:role()`) are available too.
 *
 * @param selector - The CSS selector string to parse
 * @param specs - Optional HTML/ARIA specification data for extended pseudo-classes
 * @returns A reusable Selector instance
 */
export function createSelector(selector: string, specs?: MLMLSpec) {
	let instance = caches.get(selector);
	if (instance) {
		return instance;
	}

	instance = new Selector(selector, {
		'display-size': displaySizePseudoClass(),
		...(specs
			? {
					model: contentModelPseudoClass(specs),
					aria: ariaPseudoClass(specs),
					role: ariaRolePseudoClass(specs),
				}
			: undefined),
	});
	caches.set(selector, instance);
	return instance;
}
