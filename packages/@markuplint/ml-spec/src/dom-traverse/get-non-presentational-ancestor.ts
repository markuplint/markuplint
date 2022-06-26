import type { ARIAVersion, MLMLSpec } from '../types';

import { isPresentational } from '../specs/is-presentational';

import { getComputedRole } from './get-computed-role';

export function getNonPresentationalAncestor(el: Element, specs: MLMLSpec, version: ARIAVersion) {
	let ancestor: Element | null = el.parentElement;
	while (ancestor) {
		const ancestorRole = getComputedRole(specs, ancestor, version);
		if (!isPresentational(ancestorRole?.name)) {
			return ancestorRole;
		}
		ancestor = ancestor.parentElement;
	}
	return null;
}
