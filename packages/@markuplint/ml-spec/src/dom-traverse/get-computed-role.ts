import type { ARIAVersion, MLMLSpec } from '../types';

import { getImplicitRole } from './get-implicit-role';

export function getComputedRole(specs: Readonly<MLMLSpec>, el: Element, version: ARIAVersion) {
	const role = el.getAttribute('role');
	if (role) {
		return {
			name: role.trim().toLowerCase(),
			isImplicit: false,
		};
	}
	const implicitRole = getImplicitRole(el, version, specs);
	if (implicitRole) {
		return {
			name: implicitRole,
			isImplicit: true,
		};
	}
	return null;
}
