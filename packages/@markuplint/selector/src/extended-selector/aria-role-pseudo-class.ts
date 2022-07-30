import type { SelectorResult } from '../types';
import type { ARIAVersion, MLMLSpec } from '@markuplint/ml-spec';

import { getComputedRole } from '@markuplint/ml-spec';

export function ariaRolePseudoClass(specs: MLMLSpec) {
	return (content: string) =>
		(el: Element): SelectorResult => {
			const aria = ariaPseudoClassParser(content);

			const computed = getComputedRole(specs, el, aria.version ?? '1.2');

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
	const version = _version === '1.1' ? '1.1' : '1.2';

	return {
		role: roleName.trim().toLowerCase(),
		version,
	};
}
