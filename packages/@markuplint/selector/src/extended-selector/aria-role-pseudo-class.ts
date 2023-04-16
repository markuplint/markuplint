import type { SelectorResult } from '../types';
import type { ARIAVersion, MLMLSpec } from '@markuplint/ml-spec';

import { validateAriaVersion, ARIA_RECOMMENDED_VERSION, getComputedRole } from '@markuplint/ml-spec';

export function ariaRolePseudoClass(specs: MLMLSpec) {
	return (content: string) =>
		(
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			el: Element,
		): SelectorResult => {
			const aria = ariaPseudoClassParser(content);

			const computed = getComputedRole(specs, el, aria.version ?? ARIA_RECOMMENDED_VERSION);

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
}

function ariaPseudoClassParser(syntax: string): {
	role: string;
	version?: ARIAVersion;
} {
	const [roleName, _version] = syntax.split('|');
	const version = _version ?? ARIA_RECOMMENDED_VERSION;

	if (!validateAriaVersion(version)) {
		throw new SyntaxError(`Unsupported ARIA version: ${version}`);
	}

	return {
		role: roleName?.trim().toLowerCase() ?? syntax.trim().toLowerCase(),
		version,
	};
}
