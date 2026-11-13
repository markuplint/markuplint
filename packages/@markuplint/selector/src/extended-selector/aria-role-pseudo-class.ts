import type { SelectorElement, SelectorResult } from '../types.js';
import type { ARIAVersion, MLMLSpec, SpecElement } from '@markuplint/ml-spec';

import { validateAriaVersion, ARIA_RECOMMENDED_VERSION, getComputedRole } from '@markuplint/ml-spec';

import { InvalidSelectorError } from '../invalid-selector-error.js';

export function ariaRolePseudoClass(specs: MLMLSpec) {
	return (content: string) => {
		const aria = ariaRolePseudoClassParser(content);
		return (
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			el: SelectorElement,
		): SelectorResult => {
			// A `SelectorElement` is an element of the document being searched, which has what `SpecElement` reads.
			const computed = getComputedRole(
				specs,
				el as unknown as SpecElement,
				aria.version ?? ARIA_RECOMMENDED_VERSION,
			);

			if (computed.role?.name === aria.role) {
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
		};
	};
}

/**
 * Reads the argument of `:role()`. The registry calls it when the selector is created, so a
 * wrong ARIA version is the fault of the selector, not of an element it meets.
 *
 * @param syntax - What is written in the parentheses
 * @returns The role name and the ARIA version
 * @throws {InvalidSelectorError} When the ARIA version is not supported
 */
export function ariaRolePseudoClassParser(syntax: string): {
	role: string;
	version?: ARIAVersion;
} {
	const [roleName, _version] = syntax.split('|');
	const version = _version ?? ARIA_RECOMMENDED_VERSION;

	if (!validateAriaVersion(version)) {
		throw new InvalidSelectorError(`:role(${syntax})`, `Unsupported ARIA version: ${version}`);
	}

	return {
		role: roleName?.trim().toLowerCase() ?? syntax.trim().toLowerCase(),
		version,
	};
}
