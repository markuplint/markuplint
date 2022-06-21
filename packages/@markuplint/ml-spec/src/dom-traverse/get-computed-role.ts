import type { ARIAVersion, MLMLSpec } from '../types';

import { getRoleSpec } from '../specs/get-role-spec';

import { getImplicitRole } from './get-implicit-role';

export function getComputedRole(specs: Readonly<MLMLSpec>, el: Element, version: ARIAVersion) {
	let role: string | false | null = el.getAttribute('role');
	let isImplicit = !role;

	if (!role) {
		role = getImplicitRole(el, version, specs);
		if (!role) {
			return null;
		}
		isImplicit = true;
	}

	const spec = getRoleSpec(specs, role, version);

	if (!spec) {
		return null;
	}

	return {
		...spec,
		isImplicit,
	};
}
