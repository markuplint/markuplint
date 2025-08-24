import type { ImplicitRole } from '../../types/aria.js';
import type { ARIAVersion, ComputedRole, MLMLSpec } from '../../types/index.js';

import { getImplicitRole as _getImplicitRole } from './get-implicit-role-spec.js';
import { getRoleSpec } from './get-role-spec.js';
import { resolveNamespace } from '../../utils/resolve-namespace.js';

export function getImplicitRole(
	specs: MLMLSpec,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	version: ARIAVersion,
): ComputedRole {
	const implicitRole = getImplicitRoleName(el, version, specs);
	if (implicitRole === false) {
		// No Corresponding Role
		return {
			el,
			role: null,
		};
	}
	const { namespaceURI } = resolveNamespace(el.localName, el.namespaceURI);
	const spec = getRoleSpec(specs, implicitRole, namespaceURI, version);
	if (!spec) {
		return {
			el,
			role: null,
			errorType: 'IMPLICIT_ROLE_NAMESPACE_ERROR',
		};
	}
	return {
		el,
		role: {
			...spec,
			isImplicit: true,
		},
	};
}

export function getImplicitRoleName(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	version: ARIAVersion,
	specs: MLMLSpec,
): ImplicitRole {
	return _getImplicitRole(specs, el.localName, el.namespaceURI, version, el.matches.bind(el));
}
