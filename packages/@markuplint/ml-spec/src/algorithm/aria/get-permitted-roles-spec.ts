import type { PermittedARIAAAMInfo, PermittedRoles } from '../../types/aria.js';
import type { ARIAVersion, Matches, MLMLSpec } from '../../types/index.js';
import type { ReadonlyDeep } from 'type-fest';

// @ts-ignore
import { isPlainObject } from 'is-plain-object';

import { mergeArray } from '../../utils/merge-array.js';

import { ariaSpecs } from './aria-specs.js';
import { getARIA } from './get-aria.js';

/**
 * Computes the list of permitted ARIA roles for an element at the spec level,
 * operating on tag name and namespace rather than a DOM element.
 *
 * @param specs - The full markup language specification
 * @param localName - The element's local tag name
 * @param namespace - The element's namespace URI
 * @param version - The ARIA specification version to use
 * @param matches - A function that tests CSS selector matches for conditional role resolution
 * @returns A list of permitted roles, each with a `name` and optional `deprecated` flag
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
	const { roles, graphicsRoles, dpubRoles } = ariaSpecs(specs, version);

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
		permittedRoleList = mergeArray(
			permittedRoleList,
			dpubRoles
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

	// When `permittedRoles` is explicitly `false`, no explicit role attribute is
	// allowed at all per ARIA in HTML — even a value matching the implicit role.
	// e.g. `<img alt="">`: implicit role is `presentation`, but "No role permitted"
	// means `role="presentation"` and `role="none"` are both disallowed.
	// See https://github.com/markuplint/markuplint/issues/3641 for background.
	if (permittedRoles === false) {
		return permittedRoleList;
	}

	if (implicitRole === false) {
		return permittedRoleList;
	}

	const implicitRoles: string[] =
		implicitRole === 'presentation' || implicitRole === 'none'
			? ['none', 'presentation']
			: version === '1.3' && (implicitRole === 'img' || implicitRole === 'image')
				? ['image', 'img']
				: [implicitRole];
	return mergeArray(
		implicitRoles.map(r => ({ name: r })),
		permittedRoleList,
	);
}

function isAAMInfo(permittedRoles: ReadonlyDeep<PermittedRoles>): permittedRoles is ReadonlyDeep<PermittedARIAAAMInfo> {
	return isPlainObject(permittedRoles);
}
