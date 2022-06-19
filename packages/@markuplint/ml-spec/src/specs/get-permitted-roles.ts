import type { ARIAVersion, Matches, MLMLSpec } from '../types';

import { getARIA } from './get-aria';

/**
 * Getting permitted ARIA roles.
 *
 * - If an array, it is role list.
 * - If `true`, this mean is "Any".
 * - If `false`, this mean is "No".
 */
export function getPermittedRoles(
	specs: Readonly<MLMLSpec>,
	localName: string,
	namespace: string | null,
	version: ARIAVersion,
	matches: Matches,
) {
	const aria = getARIA(specs, localName, namespace, version, matches);
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
