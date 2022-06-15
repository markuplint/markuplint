import type { Element } from '@markuplint/ml-core';
import type { ARIAVersion, MLMLSpec } from '@markuplint/ml-spec';

import { getImplicitRole } from './get-implicit-role';

export function getComputedRole(specs: Readonly<MLMLSpec>, el: Element<any, any>, version: ARIAVersion) {
	const roleAttrTokens = el.getAttributeToken('role');
	const roleAttr = roleAttrTokens[0];
	if (roleAttr) {
		const roleName = roleAttr.value.trim().toLowerCase();
		return {
			name: roleName,
			isImplicit: false,
		};
	}
	const implicitRole = getImplicitRole(specs, el, version);
	if (implicitRole) {
		return {
			name: implicitRole,
			isImplicit: true,
		};
	}
	return null;
}
