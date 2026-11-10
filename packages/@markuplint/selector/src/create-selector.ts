import type { MLMLSpec } from '@markuplint/ml-spec';

import { ariaPseudoClass } from './extended-selector/aria-pseudo-class.js';
import { ariaRolePseudoClass } from './extended-selector/aria-role-pseudo-class.js';
import { contentModelPseudoClass } from './extended-selector/content-model-pseudo-class.js';
import { displaySizePseudoClass } from './extended-selector/display-size-pseudo-class.js';
import { Selector } from './selector.js';

/**
 * Instances created without `specs`, keyed by selector string.
 */
const cachesWithoutSpecs = new Map<string, Selector>();

/**
 * Instances created with `specs`, keyed by the specs object and then by selector string.
 * The pseudo-class handlers close over `specs`, so an instance is reusable only for the
 * same object. A WeakMap keeps the cache from holding a specs object alive.
 */
const cachesBySpecs = new WeakMap<MLMLSpec, Map<string, Selector>>();

/**
 * Creates a cached {@link Selector} instance for the given CSS selector string.
 *
 * Results are cached by selector string and `specs` object, so subsequent calls
 * with the same selector and the same `specs` (or none) return the same instance.
 * An instance created without `specs` lacks the handlers of `:model()`, `:aria()`
 * and `:role()`, so it is never returned to a call with `specs`.
 *
 * `:display-size()` is always available. When `specs` is provided, markuplint's
 * other extended pseudo-classes (`:model()`, `:aria()`, `:role()`) are available too.
 *
 * @param selector - The CSS selector string to parse
 * @param specs - Optional HTML/ARIA specification data for extended pseudo-classes
 * @returns A reusable Selector instance
 * @throws {InvalidSelectorError} When the selector cannot be parsed or uses syntax the engine does not support (for example a nesting selector)
 */
export function createSelector(selector: string, specs?: MLMLSpec) {
	const caches = cachesFor(specs);

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

function cachesFor(specs: MLMLSpec | undefined) {
	if (!specs) {
		return cachesWithoutSpecs;
	}
	let caches = cachesBySpecs.get(specs);
	if (!caches) {
		caches = new Map();
		cachesBySpecs.set(specs, caches);
	}
	return caches;
}
