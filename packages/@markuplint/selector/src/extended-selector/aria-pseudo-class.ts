import type { SelectorElement, SelectorResult } from '../types.js';
import type { ARIAVersion } from '@markuplint/ml-spec';

import { validateAriaVersion, ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

import { InvalidSelectorError } from '../invalid-selector-error.js';

/**
 * Version syntax is parsed but not yet used for filtering.
 *
 * ## Accessible name resolution strategy
 *
 * The element is an `MLElement` from `@markuplint/ml-core`, and its `getAccessibleName()` is called so
 * that its per-element memoization cache is shared with other consumers (`require-accessible-name`,
 * `wai-aria`, etc.). `SelectorElement#getAccessibleName` is how the `@markuplint/selector` package, which
 * sits below `@markuplint/ml-core` in the dependency graph, reads it.
 */
export function ariaPseudoClass() {
	return (content: string) => {
		const aria = ariaPseudoClassParser(content);
		return (
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			el: SelectorElement,
		): SelectorResult => {
			const version = aria.version ?? ARIA_RECOMMENDED_VERSION;

			const name = el.getAccessibleName(version);
			switch (aria.type) {
				case 'hasName': {
					if (name) {
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
					if (!name) {
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
