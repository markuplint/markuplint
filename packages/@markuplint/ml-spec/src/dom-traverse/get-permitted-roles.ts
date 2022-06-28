import type { ARIAVersion, MLMLSpec } from '../types';

import { getPermittedRoles as _getPermittedRoles } from '../specs/get-permitted-roles';

export function getPermittedRoles(el: Element, version: ARIAVersion, specs: Readonly<MLMLSpec>) {
	return _getPermittedRoles(specs, el.localName, el.namespaceURI, version, el.matches.bind(el));
}
