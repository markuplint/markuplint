import type { ImplicitRole } from '../../types/aria.js';
import type { ARIAVersion, ComputedRole, MLMLSpec } from '../../types/index.js';

import { getImplicitRole as _getImplicitRole } from './get-implicit-role-spec.js';
import { getRoleSpec } from './get-role-spec.js';
import { resolveNamespace } from '../../utils/resolve-namespace.js';

/**
 * Determines the implicit (native) ARIA role for an element based on its tag name,
 * namespace, and any matching conditions defined in the HTML-ARIA spec.
 *
 * @param specs - The full markup language specification
 * @param el - The DOM element to determine the implicit role for
 * @param version - The ARIA specification version to use
 * @returns The computed role result containing the implicit role spec, or null if no corresponding role exists
 */
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

/**
 * Retrieves the implicit role name string for an element without resolving
 * the full role specification. Returns `false` when no corresponding role exists.
 *
 * @param el - The DOM element to look up the implicit role name for
 * @param version - The ARIA specification version to use
 * @param specs - The full markup language specification
 * @returns The implicit role name string, or `false` if the element has no corresponding role
 */
export function getImplicitRoleName(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	version: ARIAVersion,
	specs: MLMLSpec,
): ImplicitRole {
	return _getImplicitRole(specs, el.localName, el.namespaceURI, version, el.matches.bind(el));
}
