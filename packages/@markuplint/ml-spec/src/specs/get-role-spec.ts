import type { ARIRRoleAttribute, MLMLSpec } from '../types';

export function getRoleSpec(specs: Readonly<MLMLSpec>, roleName: string) {
	const role = getRoleByName(specs, roleName);
	if (!role) {
		return null;
	}
	const superClassRoles = recursiveTraverseSuperClassRoles(specs, roleName);
	return {
		name: role.name,
		isAbstract: !!role.isAbstract,
		accessibleNameRequired: role.accessibleNameRequired,
		statesAndProps: role.ownedProperties,
		superClassRoles,
	};
}

function getRoleByName(specs: Readonly<MLMLSpec>, roleName: string) {
	const roles = specs.def['#roles'];
	const role = roles.find(r => r.name === roleName);
	return role;
}

function recursiveTraverseSuperClassRoles(specs: Readonly<MLMLSpec>, roleName: string) {
	const roles: ARIRRoleAttribute[] = [];
	const superClassRoles = getSuperClassRoles(specs, roleName);
	if (superClassRoles) {
		roles.push(...superClassRoles);
		for (const superClassRole of superClassRoles) {
			const ancestorRoles = recursiveTraverseSuperClassRoles(specs, superClassRole.name);
			roles.push(...ancestorRoles);
		}
	}
	return roles;
}

function getSuperClassRoles(specs: Readonly<MLMLSpec>, roleName: string) {
	const role = getRoleByName(specs, roleName);
	return (
		role?.generalization
			.map(roleName => getRoleByName(specs, roleName))
			.filter((role): role is ARIRRoleAttribute => !!role) || null
	);
}
