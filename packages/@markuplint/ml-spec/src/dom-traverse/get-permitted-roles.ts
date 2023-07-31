import type { ARIAVersion, MLMLSpec } from '../types/index.js';

import { getPermittedRoles as _getPermittedRoles } from '../specs/get-permitted-roles.js';

export function getPermittedRoles(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	version: ARIAVersion,
	specs: MLMLSpec,
) {
	return _getPermittedRoles(specs, el.localName, el.namespaceURI, version, el.matches.bind(el));
}
