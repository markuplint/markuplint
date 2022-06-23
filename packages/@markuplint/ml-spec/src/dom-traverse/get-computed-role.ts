import type { ARIAVersion, MLMLSpec } from '../types';

import { ariaSpecs } from '../specs/aria-specs';
import { getRoleSpec } from '../specs/get-role-spec';
import { resolveNamespace } from '../utils/resolve-namespace';

import { getImplicitRole } from './get-implicit-role';
import { getPermittedRoles } from './get-permitted-roles';

type Role<I extends boolean = boolean> = ReturnType<typeof getRoleSpec> & { isImplicit: I };

export function getComputedRole(specs: Readonly<MLMLSpec>, el: Element, version: ARIAVersion): Role | null {
	const implicitRole = getImplicitRoleSpec(specs, el, version);
	const role = getComputedRoleWithoutRoleRequirementResolution(specs, el, version, implicitRole);
	if (!role) {
		return role;
	}
	if (!isNotImplicit(role)) {
		return role;
	}
	return resolvePresentationalRolesConflict(el, role, implicitRole, specs, version);
}

/**
 * Presentational Roles Conflict Resolution
 *
 * @see https://www.w3.org/TR/wai-aria/#conflict_resolution_presentation_none
 * @see https://w3c.github.io/aria/#conflict_resolution_presentation_none
 */
function resolvePresentationalRolesConflict(
	el: Element,
	role: Role<false>,
	implicitRole: Role<true> | null,
	specs: Readonly<MLMLSpec>,
	version: ARIAVersion,
): Role | null {
	if (!['presentation', 'none'].includes(role.name)) {
		return role;
	}

	/**
	 * > If an element is focusable,
	 * > user agents MUST ignore the presentation/none role
	 * > and expose the element with its implicit role,
	 * > in order to ensure that the element is operable.
	 *
	 * With the issue: What does focusable or otherwise interactive mean](https://github.com/w3c/aria/issues/1192)
	 */
	// TODO: implement

	/**
	 * > If a required owned element has an explicit non-presentational role,
	 * > user agents MUST ignore an inherited presentational role
	 * > and expose the element with its explicit role.
	 * > If the action of exposing the explicit role
	 * > causes the accessibility tree to be malformed,
	 * > the expected results are undefined.
	 */
	// TODO: implement

	/**
	 * > If an element has global WAI-ARIA states or properties,
	 * > user agents MUST ignore the presentation role
	 * > and instead expose the element's implicit role.
	 * > However, if an element has only non-global,
	 * > role-specific WAI-ARIA states or properties,
	 * > the element MUST NOT be exposed
	 * > unless the presentational role is inherited
	 * > and an explicit non-presentational role is applied.
	 */
	const { props } = ariaSpecs(specs, version);
	for (const attr of Array.from(el.attributes)) {
		if (props.find(p => p.name === attr.localName)?.isGlobal) {
			return implicitRole;
		}
	}

	return role;
}

function getComputedRoleWithoutRoleRequirementResolution(
	specs: Readonly<MLMLSpec>,
	el: Element,
	version: ARIAVersion,
	implicitRole: Role<true> | null,
): Role | null {
	const roleValue = el.getAttribute('role');
	const roles = roleValue?.toLowerCase().trim().split(/\s+/g) || [];
	const permittedRoles = getPermittedRoles(el, version, specs);
	const { namespaceURI } = resolveNamespace(el.localName, el.namespaceURI);

	for (const role of roles) {
		const spec = getRoleSpec(specs, role, namespaceURI, version);
		if (!spec) {
			continue;
		}
		if (spec.isAbstract) {
			continue;
		}
		if (permittedRoles.some(r => r.name === role)) {
			return {
				...spec,
				isImplicit: false,
			};
		}
	}

	return implicitRole;
}

function getImplicitRoleSpec(specs: Readonly<MLMLSpec>, el: Element, version: ARIAVersion): Role<true> | null {
	const implicitRole = getImplicitRole(el, version, specs);
	if (implicitRole === false) {
		return null;
	}
	const { namespaceURI } = resolveNamespace(el.localName, el.namespaceURI);
	const spec = getRoleSpec(specs, implicitRole, namespaceURI, version);
	if (!spec) {
		return null;
	}
	return {
		...spec,
		isImplicit: true,
	};
}

function isNotImplicit(role: Role): role is Role<false> {
	return !role.isImplicit;
}
