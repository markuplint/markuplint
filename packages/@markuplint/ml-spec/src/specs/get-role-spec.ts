import type { ARIAVersion, ARIARoleInSchema, MLMLSpec, ARIARole } from '../types';

import { ariaSpecs } from './aria-specs';

export function getRoleSpec(
	specs: Readonly<MLMLSpec>,
	roleName: string,
	version: ARIAVersion,
): (ARIARole & { superClassRoles: ARIARoleInSchema[] }) | null {
	const role = getRoleByName(specs, roleName, version);
	if (!role) {
		return null;
	}
	const superClassRoles = recursiveTraverseSuperClassRoles(specs, roleName, version);
	return {
		name: role.name,
		isAbstract: !!role.isAbstract,
		requiredContextRole: role.requiredContextRole ?? [],
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

function recursiveTraverseSuperClassRoles(specs: Readonly<MLMLSpec>, roleName: string, version: ARIAVersion) {
	const roles: ARIARoleInSchema[] = [];
	const superClassRoles = getSuperClassRoles(specs, roleName, version);
	if (superClassRoles) {
		roles.push(...superClassRoles);
		for (const superClassRole of superClassRoles) {
			const ancestorRoles = recursiveTraverseSuperClassRoles(specs, superClassRole.name, version);
			roles.push(...ancestorRoles);
		}
	}
	return roles;
}

function getSuperClassRoles(specs: Readonly<MLMLSpec>, roleName: string, version: ARIAVersion) {
	const role = getRoleByName(specs, roleName, version);
	return (
		role?.generalization
			?.map(roleName => getRoleByName(specs, roleName, version))
			.filter((role): role is ARIARoleInSchema => !!role) || null
	);
}

function getRoleByName(specs: Readonly<MLMLSpec>, roleName: string, version: ARIAVersion) {
	const { roles } = ariaSpecs(specs, version);
	const role = roles.find(r => r.name === roleName);
	return role;
}
