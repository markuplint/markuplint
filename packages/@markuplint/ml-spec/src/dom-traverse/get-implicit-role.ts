import type { ARIAVersion, MLMLSpec } from '../types';

import { getImplicitRole as _getImplicitRole } from '../specs/get-implicit-role';

export function getImplicitRole(el: Element, version: ARIAVersion, specs: Readonly<MLMLSpec>) {
	return _getImplicitRole(specs, el.localName, el.namespaceURI, version, el.matches.bind(el));
}
