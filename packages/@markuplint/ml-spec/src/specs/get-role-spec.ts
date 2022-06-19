import type { ARIAVersion, ARIRRole, MLMLSpec } from '../types';

import { ariaSpecs } from './aria-specs';

export function getRoleSpec(specs: Readonly<MLMLSpec>, roleName: string, version: ARIAVersion) {
	const role = getRoleByName(specs, roleName, version);
	if (!role) {
		return null;
	}
	const superClassRoles = recursiveTraverseSuperClassRoles(specs, roleName, version);
	return {
		name: role.name,
		isAbstract: !!role.isAbstract,
		accessibleNameRequired: role.accessibleNameRequired,
		statesAndProps: role.ownedProperties,
		superClassRoles,
	};
}

function getRoleByName(specs: Readonly<MLMLSpec>, roleName: string, version: ARIAVersion) {
	const { roles } = ariaSpecs(specs, version);
	const role = roles.find(r => r.name === roleName);
	return role;
}

function recursiveTraverseSuperClassRoles(specs: Readonly<MLMLSpec>, roleName: string, version: ARIAVersion) {
	const roles: ARIRRole[] = [];
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
			.map(roleName => getRoleByName(specs, roleName, version))
			.filter((role): role is ARIRRole => !!role) || null
	);
}
