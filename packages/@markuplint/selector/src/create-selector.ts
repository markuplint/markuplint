import type { MLMLSpec } from '@markuplint/ml-spec';

import { ariaPseudoClass, ariaPseudoClassParser } from './extended-selector/aria-pseudo-class.js';
import { ariaRolePseudoClass, ariaRolePseudoClassParser } from './extended-selector/aria-role-pseudo-class.js';
import { contentModelPseudoClass, readContentModelCategory } from './extended-selector/content-model-pseudo-class.js';
import { displaySizePseudoClass } from './extended-selector/display-size-pseudo-class.js';
import { InvalidSelectorError } from './invalid-selector-error.js';
import { Selector } from './selector.js';
import type { ExtendedPseudoClass } from './selector.js';

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
 * What an instance created without `specs` holds for the pseudo-classes that need them. It reads
 * what the argument's grammar allows without `specs`, so that a wrong one is found when the
 * selector is created (the configuration check creates selectors without `specs`): the version
 * and the query of `:aria()`, the version of `:role()`, and an empty category of `:model()`,
 * whose categories only `specs` lists. It cannot match: matching without `specs` is the fault of
 * the caller, and it throws the same `InvalidSelectorError` as for a pseudo-class the engine does
 * not know.
 */
const withoutSpecs: ExtendedPseudoClass = {
	model: content => {
		readContentModelCategory(null, content);
		return unmatchable('model', content);
	},
	aria: content => {
		ariaPseudoClassParser(content);
		return unmatchable('aria', content);
	},
	role: content => {
		ariaRolePseudoClassParser(content);
		return unmatchable('role', content);
	},
};

function unmatchable(name: string, content: string) {
	return () => {
		throw new InvalidSelectorError(`:${name}(${content})`, `Unsupported pseudo :${name}(${content}) selector.`);
	};
}

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
 * Without `specs`, a selector that holds them can be created and its arguments are checked
 * as far as `specs` is not needed (an unknown `:model()` category is found only with `specs`),
 * but matching it throws `InvalidSelectorError`.
 *
 * @param selector - The CSS selector string to parse
 * @param specs - Optional HTML/ARIA specification data for extended pseudo-classes
 * @returns A reusable Selector instance
 * @throws {InvalidSelectorError} When the selector cannot be parsed or uses syntax the engine does not support
 * (a nesting selector, the column combinator, a pseudo-class it does not know), or an extended pseudo-class has
 * a wrong argument. It is thrown here, not when the selector meets an element
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
			: withoutSpecs),
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
