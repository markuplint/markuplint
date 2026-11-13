import type { SelectorElement, SelectorResult } from '../types.js';
import type { ARIAVersion, MLMLSpec } from '@markuplint/ml-spec';

import { validateAriaVersion, ARIA_RECOMMENDED_VERSION, getAccname } from '@markuplint/ml-spec';

import { InvalidSelectorError } from '../invalid-selector-error.js';

/**
 * Version syntax is parsed but not yet used for filtering.
 *
 * ## Accessible name resolution strategy
 *
 * When the element exposes a `getAccessibleName()` method (i.e. it is an
 * `MLElement` from `@markuplint/ml-core`), that method is called via
 * duck-typing so that its per-element memoization cache is shared with
 * other consumers (`require-accessible-name`, `wai-aria`, etc.).
 *
 * The `@markuplint/selector` package cannot depend on `@markuplint/ml-core`
 * (it sits lower in the dependency graph), so a structural type check
 * (`'getAccessibleName' in el`) is used instead of an `instanceof` guard.
 *
 * An element whose name is in a branch of a conditional block has no name as written, but may have
 * one, so `has name` matches it and `has no name` does not: the same duck-typed
 * `mayHaveAccessibleName()` is asked when the name as written is empty.
 *
 * For elements that do **not** have the method (e.g. plain DOM `Element`
 * instances in unit tests), the function falls back to the stateless
 * `getAccname()` from `@markuplint/ml-spec`.
 */
export function ariaPseudoClass(specs: MLMLSpec) {
	return (content: string) => {
		const aria = ariaPseudoClassParser(content);
		return (
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			el: SelectorElement,
		): SelectorResult => {
			const version = aria.version ?? ARIA_RECOMMENDED_VERSION;

			// Prefer MLElement.getAccessibleName() (cached) over ml-spec's
			// stateless getAccname(). The duck-typing check is necessary because
			// SelectorElement is an interface that does not declare
			// getAccessibleName — the concrete MLElement adds it at runtime.
			const name =
				'getAccessibleName' in el && typeof (el as Record<string, unknown>).getAccessibleName === 'function'
					? (el as unknown as { getAccessibleName(v: ARIAVersion): string }).getAccessibleName(version)
					: getAccname(el as Element, specs, version);
			// An element whose name is in a branch of a conditional block may have a name: the markup as
			// written does not say which branch is rendered (`MLElement#mayHaveAccessibleName`)
			const hasName =
				!!name ||
				('mayHaveAccessibleName' in el &&
					typeof (el as Record<string, unknown>).mayHaveAccessibleName === 'function' &&
					(el as unknown as { mayHaveAccessibleName(v: ARIAVersion): boolean }).mayHaveAccessibleName(
						version,
					));
			switch (aria.type) {
				case 'hasName': {
					if (hasName) {
						return {
							specificity: [0, 1, 0],
							matched: true,
							nodes: [el],
							has: [],
						};
					}
					return {
						specificity: [0, 1, 0],
						matched: false,
					};
				}
				case 'hasNoName': {
					if (!hasName) {
						return {
							specificity: [0, 1, 0],
							matched: true,
							nodes: [el],
							has: [],
						};
					}
					return {
						specificity: [0, 1, 0],
						matched: false,
					};
				}
			}
		};
	};
}

/**
 * Reads the argument of `:aria()`. The registry calls it when the selector is created, so a
 * wrong argument is the fault of the selector, not of an element it meets.
 *
 * @param syntax - What is written in the parentheses
 * @returns What the argument asks for
 * @throws {InvalidSelectorError} When the query or the ARIA version is not supported
 */
export function ariaPseudoClassParser(syntax: string): {
	type: 'hasName' | 'hasNoName';
	version?: ARIAVersion;
} {
	const [_query, _version] = syntax.split('|');
	const query = _query?.replaceAll(/\s+/g, '').toLowerCase();
	const version = _version ?? ARIA_RECOMMENDED_VERSION;

	if (!validateAriaVersion(version)) {
		throw new InvalidSelectorError(`:aria(${syntax})`, `Unsupported ARIA version: ${version}`);
	}

	switch (query) {
		case 'hasname': {
			return {
				type: 'hasName',
				version,
			};
		}
		case 'hasnoname': {
			return {
				type: 'hasNoName',
				version,
			};
		}
	}

	throw new InvalidSelectorError(`:aria(${syntax})`, `Unsupported syntax: ${syntax}`);
}
