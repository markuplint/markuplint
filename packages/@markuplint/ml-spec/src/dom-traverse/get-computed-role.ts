import type { ARIAVersion, MLMLSpec } from '../types';

import { getRoleSpec } from '../specs/get-role-spec';
import { resolveNamespace } from '../utils/resolve-namespace';

import { getImplicitRole } from './get-implicit-role';
import { getPermittedRoles } from './get-permitted-roles';

export function getComputedRole(specs: Readonly<MLMLSpec>, el: Element, version: ARIAVersion) {
	const roleValue = el.getAttribute('role');
	const roles = roleValue?.toLowerCase().trim().split(/\s+/g) || [];
	const permittedRoles = getPermittedRoles(el, version, specs);
	const implicitRole = getImplicitRole(el, version, specs);
	const { namespaceURI } = resolveNamespace(el.localName, el.namespaceURI);

	for (const role of roles) {
		const spec = getRoleSpec(specs, role, namespaceURI, version);
		if (!spec) {
			continue;
		}
		if (spec.isAbstract) {
			continue;
		}
		if (permittedRoles.some(r => r.name === role)) {
			return {
				...spec,
				isImplicit: false,
			};
		}
	}

	if (implicitRole === false) {
		return null;
	}

	const spec = getRoleSpec(specs, implicitRole, namespaceURI, version);

	if (!spec) {
		return null;
	}

	return {
		...spec,
		isImplicit: true,
	};
}
