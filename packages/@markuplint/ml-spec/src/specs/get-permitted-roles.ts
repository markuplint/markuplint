import type { ARIAVersion, Matches, MLMLSpec } from '../types';
import type { PermittedARIAAAMInfo, PermittedRoles } from '../types/aria';
import type { ReadonlyDeep } from 'type-fest';

import { isPlainObject } from 'is-plain-object';

import { mergeArray } from '../utils/merge-array';

import { ariaSpecs } from './aria-specs';
import { getARIA } from './get-aria';

/**
 * Getting permitted ARIA roles.
 *
 * - If an array, it is role list.
 * - If `true`, this mean is "Any".
 * - If `false`, this mean is "No".
 */
export function getPermittedRoles(
	specs: MLMLSpec,
	localName: string,
	namespace: string | null,
	version: ARIAVersion,
	matches: Matches,
): readonly {
	readonly name: string;
	readonly deprecated?: boolean;
}[] {
	const aria = getARIA(specs, localName, namespace, version, matches);
	if (!aria) {
		return [];
	}
	const { implicitRole, permittedRoles } = aria;
	const { roles, graphicsRoles } = ariaSpecs(specs, version);

	let permittedRoleList: readonly { readonly name: string }[] = [];

	if (permittedRoles === true) {
		permittedRoleList = mergeArray(
			permittedRoleList,
			roles
				.filter(role => !role.isAbstract)
				.map(role => ({
					name: role.name,
				})),
		);
	}

	if (isAAMInfo(permittedRoles)) {
		if (permittedRoles['core-aam']) {
			permittedRoleList = mergeArray(
				permittedRoleList,
				roles
					.filter(role => !role.isAbstract)
					.map(role => ({
						name: role.name,
					})),
			);
		}
		if (permittedRoles['graphics-aam']) {
			permittedRoleList = mergeArray(
				permittedRoleList,
				graphicsRoles
					.filter(role => !role.isAbstract)
					.map(role => ({
						name: role.name,
					})),
			);
		}
	} else if (typeof permittedRoles !== 'boolean') {
		permittedRoleList = mergeArray(
			permittedRoleList,
			permittedRoles.map(role => {
				if (typeof role === 'string') {
					return {
						name: role,
					};
				}
				return role;
			}),
		);
	}

	if (implicitRole) {
		const implicitRoles =
			implicitRole === 'presentation' || implicitRole === 'none' ? ['none', 'presentation'] : [implicitRole];
		return mergeArray(
			implicitRoles.map(r => ({ name: r })),
			permittedRoleList,
		);
	}

	return permittedRoleList;
}

function isAAMInfo(permittedRoles: ReadonlyDeep<PermittedRoles>): permittedRoles is ReadonlyDeep<PermittedARIAAAMInfo> {
	return isPlainObject(permittedRoles);
}
