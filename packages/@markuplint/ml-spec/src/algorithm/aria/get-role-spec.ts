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
	const requiredAccessibilityParentRole = role.requiredContextRole ?? role.requiredAccessibilityParentRole ?? [];
	const allowedAccessibilityChildRoles = role.requiredOwnedElements ?? role.allowedAccessibilityChildRoles ?? [];
	return {
		name: role.name,
		isAbstract: !!role.isAbstract,
		deprecated: !!role.deprecated,
		requiredAccessibilityParentRole,
		allowedAccessibilityChildRoles,
		requiredContextRole: requiredAccessibilityParentRole,
		requiredOwnedElements: allowedAccessibilityChildRoles,
		accessibleNameRequired: !!role.accessibleNameRequired,
		accessibleNameFromAuthor: !!role.accessibleNameFromAuthor,
		accessibleNameFromContent: !!role.accessibleNameFromContent,
		accessibleNameProhibited: !!role.accessibleNameProhibited,
		childrenPresentational: !!role.childrenPresentational,
		ownedProperties: inheritRequired(role.ownedProperties ?? [], superClassRoles),
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
	const { roles, graphicsRoles, dpubRoles } = ariaSpecs(specs, version);
	let role = roles.find(r => r.name === roleName);
	if (!role && namespace === 'http://www.w3.org/2000/svg') {
		role = graphicsRoles.find(r => r.name === roleName);
	}
	if (!role) {
		role = dpubRoles.find(r => r.name === roleName);
	}
	return role;
}

/**
 * A property that a role inherits is required when a superclass role requires it: the data of an edition can list an
 * inherited property without the mark (the ARIA 1.1 and 1.2 data of `menuitemradio` and `treeitem`).
 *
 * > States and properties specifically required for the role and subclass roles.
 *
 * @see https://w3c.github.io/aria/#requiredState
 * @param ownedProperties - The properties of the role
 * @param superClassRoles - Every superclass role of it
 * @returns The properties, an inherited one marked required where a superclass role requires it
 */
function inheritRequired(
	ownedProperties: NonNullable<ARIARoleInSchema['ownedProperties']>,
	superClassRoles: readonly ARIARoleInSchema[],
): NonNullable<ARIARoleInSchema['ownedProperties']> {
	return ownedProperties.map(prop => {
		if (!prop.inherited || prop.required) {
			return prop;
		}
		const requiring = superClassRoles.flatMap(
			sup => sup.ownedProperties?.filter(p => p.name === prop.name && p.required) ?? [],
		);
		if (requiring.length === 0) {
			return prop;
		}
		// The condition of the superclass goes with it (`aria-valuenow` of `separator` only when it is focusable); a
		// superclass that requires it without one makes it required without one
		const condition = requiring.every(p => p.requiredCondition) ? requiring[0]?.requiredCondition : undefined;
		return { ...prop, required: true, ...(condition ? { requiredCondition: condition } : {}) };
	});
}
