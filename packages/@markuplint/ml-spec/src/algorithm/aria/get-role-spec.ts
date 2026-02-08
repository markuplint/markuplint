import type { ARIAVersion, ARIARoleInSchema, MLMLSpec, ARIARole } from '../../types/index.js';
import type { NamespaceURI } from '@markuplint/ml-ast';

import { ariaSpecs } from './aria-specs.js';

/**
 * Retrieves the full ARIA role specification for a given role name, including
 * its properties, requirements, and the complete chain of super-class roles.
 * For SVG namespace elements, also searches graphics ARIA roles.
 *
 * @param specs - The full markup language specification
 * @param roleName - The name of the ARIA role to look up
 * @param namespace - The namespace URI of the element context
 * @param version - The ARIA specification version to use
 * @returns The role specification with super-class roles, or null if the role does not exist
 */
export function getRoleSpec(
	specs: MLMLSpec,
	roleName: string,
	namespace: NamespaceURI,
	version: ARIAVersion,
): (ARIARole & { superClassRoles: ARIARoleInSchema[] }) | null {
	const role = getRoleByName(specs, roleName, namespace, version);
	if (!role) {
		return null;
	}
	const superClassRoles = recursiveTraverseSuperClassRoles(specs, roleName, namespace, version);
	return {
		name: role.name,
		isAbstract: !!role.isAbstract,
		deprecated: !!role.deprecated,
		requiredContextRole: role.requiredContextRole ?? [],
		requiredOwnedElements: role.requiredOwnedElements ?? [],
		accessibleNameRequired: !!role.accessibleNameRequired,
		accessibleNameFromAuthor: !!role.accessibleNameFromAuthor,
		accessibleNameFromContent: !!role.accessibleNameFromContent,
		accessibleNameProhibited: !!role.accessibleNameProhibited,
		childrenPresentational: !!role.childrenPresentational,
		ownedProperties: role.ownedProperties ?? [],
		prohibitedProperties: role.prohibitedProperties ?? [],
		superClassRoles,
	};
}

function recursiveTraverseSuperClassRoles(
	specs: MLMLSpec,
	roleName: string,
	namespace: NamespaceURI,
	version: ARIAVersion,
) {
	const roles: ARIARoleInSchema[] = [];
	const superClassRoles = getSuperClassRoles(specs, roleName, namespace, version);
	if (superClassRoles) {
		roles.push(...superClassRoles);
		for (const superClassRole of superClassRoles) {
			const ancestorRoles = recursiveTraverseSuperClassRoles(specs, superClassRole.name, namespace, version);
			roles.push(...ancestorRoles);
		}
	}
	return roles;
}

function getSuperClassRoles(specs: MLMLSpec, roleName: string, namespace: NamespaceURI, version: ARIAVersion) {
	const role = getRoleByName(specs, roleName, namespace, version);
	return (
		role?.generalization
			?.map(roleName => getRoleByName(specs, roleName, namespace, version))
			.filter((role): role is ARIARoleInSchema => !!role) ?? null
	);
}

function getRoleByName(specs: MLMLSpec, roleName: string, namespace: NamespaceURI, version: ARIAVersion) {
	const { roles, graphicsRoles } = ariaSpecs(specs, version);
	let role = roles.find(r => r.name === roleName);
	if (!role && namespace === 'http://www.w3.org/2000/svg') {
		role = graphicsRoles.find(r => r.name === roleName);
	}
	return role;
}
