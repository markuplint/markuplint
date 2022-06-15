import type { Element } from '@markuplint/ml-core';
import type { ARIAVersion, MLMLSpec } from '@markuplint/ml-spec';

import { getARIA } from './get-aria';

/**
 * Getting permitted ARIA roles.
 *
 * - If an array, it is role list.
 * - If `true`, this mean is "Any".
 * - If `false`, this mean is "No".
 */
export function getPermittedRoles(specs: Readonly<MLMLSpec>, el: Element<any, any>, version: ARIAVersion) {
	const aria = getARIA(specs, el, version);
	if (!aria) {
		return true;
	}
	const { implicitRole, permittedRoles } = aria;
	if (implicitRole && Array.isArray(permittedRoles)) {
		return [implicitRole, ...permittedRoles];
	}
	if (implicitRole && permittedRoles === false) {
		return [implicitRole];
	}
	return permittedRoles;
}
