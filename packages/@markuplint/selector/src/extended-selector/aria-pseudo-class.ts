import type { SelectorElement, SelectorResult } from '../types.js';
import type { ARIAVersion, MLMLSpec } from '@markuplint/ml-spec';

import { validateAriaVersion, ARIA_RECOMMENDED_VERSION, getAccname } from '@markuplint/ml-spec';

/**
 * Creates the `:aria()` extended pseudo-class handler.
 *
 * Matches elements by accessible name presence using `getAccname()`.
 * Supports `has name` and `has no name` syntax.
 * Version syntax is parsed but not yet used for filtering.
 *
 * @param specs - The ML specification data for role resolution
 * @returns An extended pseudo-class handler function
 */
export function ariaPseudoClass(specs: MLMLSpec) {
	return (content: string) =>
		(
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			el: SelectorElement,
		): SelectorResult => {
			const aria = ariaPseudoClassParser(content);
			// SelectorElement is structurally compatible with Element at runtime (backed by MLElement)
			const name = getAccname(el as Element, specs, aria.version ?? ARIA_RECOMMENDED_VERSION);
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
}

function ariaPseudoClassParser(syntax: string): {
	type: 'hasName' | 'hasNoName';
	version?: ARIAVersion;
} {
	const [_query, _version] = syntax.split('|');
	const query = _query?.replaceAll(/\s+/g, '').toLowerCase();
	const version = _version ?? ARIA_RECOMMENDED_VERSION;

	if (!validateAriaVersion(version)) {
		throw new SyntaxError(`Unsupported ARIA version: ${version}`);
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

	throw new SyntaxError(`Unsupported syntax: ${syntax}`);
}
