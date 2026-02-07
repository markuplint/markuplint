import type { ARIAVersion, MLMLSpec } from '../../types/index.js';

import { getPermittedRoles as _getPermittedRoles } from './get-permitted-roles-spec.js';

/**
 * Retrieves the list of permitted ARIA roles that may be explicitly assigned
 * to an element, based on its tag name, namespace, and current attribute state.
 *
 * @param el - The DOM element to determine permitted roles for
 * @param version - The ARIA specification version to use
 * @param specs - The full markup language specification
 * @returns The permitted roles specification, which may be a boolean, an array of role names, or an AAM reference
 */
export function getPermittedRoles(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	version: ARIAVersion,
	specs: MLMLSpec,
) {
	return _getPermittedRoles(specs, el.localName, el.namespaceURI, version, el.matches.bind(el));
}
