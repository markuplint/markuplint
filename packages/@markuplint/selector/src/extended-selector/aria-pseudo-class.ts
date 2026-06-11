import type { SelectorElement, SelectorResult } from '../types.js';
import type { ARIAVersion, MLMLSpec } from '@markuplint/ml-spec';

import { validateAriaVersion, ARIA_RECOMMENDED_VERSION, getAccname } from '@markuplint/ml-spec';

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
 * For elements that do **not** have the method (e.g. plain DOM `Element`
 * instances in unit tests), the function falls back to the stateless
 * `getAccname()` from `@markuplint/ml-spec`.
 */
export function ariaPseudoClass(specs: MLMLSpec) {
	return (content: string) =>
		(
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			el: SelectorElement,
		): SelectorResult => {
			const aria = ariaPseudoClassParser(content);
			const version = aria.version ?? ARIA_RECOMMENDED_VERSION;

			// Prefer MLElement.getAccessibleName() (cached) over ml-spec's
			// stateless getAccname(). The duck-typing check is necessary because
			// SelectorElement is an interface that does not declare
			// getAccessibleName — the concrete MLElement adds it at runtime.
			const name =
				'getAccessibleName' in el && typeof (el as Record<string, unknown>).getAccessibleName === 'function'
					? (el as unknown as { getAccessibleName(v: ARIAVersion): string }).getAccessibleName(version)
					: getAccname(el as Element, specs, version);
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
