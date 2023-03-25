import type { ARIAVersion, MLMLSpec } from '../types';

import { isPresentational } from '../specs/is-presentational';

import { getComputedRole } from './get-computed-role';

export function getNonPresentationalAncestor(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
) {
	let ancestor: Element | null = el.parentElement;
	while (ancestor) {
		const ancestorRole = getComputedRole(specs, ancestor, version);
		if (!isPresentational(ancestorRole.role?.name)) {
			return ancestorRole;
		}
		ancestor = ancestor.parentElement;
	}
	return {
		el: ancestor,
		role: null,
	};
}
