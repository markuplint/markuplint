import type { ARIAVersion, MLMLSpec } from '../types';

import { ariaSpecs } from '../specs/aria-specs';
import { getRoleSpec } from '../specs/get-role-spec';
import { resolveNamespace } from '../utils/resolve-namespace';

import { getImplicitRole as getImplicitRoleName } from './get-implicit-role';
import { getPermittedRoles } from './get-permitted-roles';

type Role<I extends boolean = boolean> = ReturnType<typeof getRoleSpec> & { isImplicit: I };

export function getComputedRole(specs: Readonly<MLMLSpec>, el: Element, version: ARIAVersion): Role | null {
	const implicitRole = getImplicitRole(specs, el, version);
	const explicitRole = getExplicitRole(specs, el, version);
	if (!explicitRole) {
		return implicitRole;
	}
	return resolvePresentationalRolesConflict(el, explicitRole, implicitRole, specs, version);
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
	 *
	 * In other words,
	 * if the element has `role=presentation` and
	 * the role of the parent element has a required owned element,
	 * `role=presentation` is to be ignored absolutely.
	 */
	if (el.parentElement) {
		const parentRole = getComputedRole(specs, el.parentElement, version);
		if (parentRole?.requiredOwnedElements.length && implicitRole) {
			return implicitRole;
		}
	}

	/**
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
		if (props.find(p => p.name === attr.name)?.isGlobal) {
			return implicitRole;
		}
	}

	return role;
}

function getExplicitRole(specs: Readonly<MLMLSpec>, el: Element, version: ARIAVersion): Role<false> | null {
	const roleValue = el.getAttribute('role');
	const roleNames = roleValue?.toLowerCase().trim().split(/\s+/g) || [];
	const permittedRoles = getPermittedRoles(el, version, specs);
	const { namespaceURI } = resolveNamespace(el.localName, el.namespaceURI);

	/**
	 * Resolve from values and **Handling Author Errors**
	 *
	 * @see https://w3c.github.io/aria/#document-handling_author-errors_roles
	 */
	for (const roleName of roleNames) {
		const spec = getRoleSpec(specs, roleName, namespaceURI, version);

		/**
		 * If `spec` is null, the role DOES NOT EXIST.
		 *
		 * > If the role attribute contains no tokens matching the name
		 * > of a non-abstract WAI-ARIA role,
		 * > the user agent MUST treat the element as
		 * > if no role had been provided. For example,
		 * > <table role="foo"> should be exposed
		 * > in the same way as <table> and <input type="text" role="structure">
		 * > in the same way as <input type="text">.
		 */
		if (!spec) {
			continue;
		}

		/**
		 * > As stated in the Definition of Roles section,
		 * > it is considered an authoring error to use abstract roles in content.
		 * > User agents MUST NOT map abstract roles
		 * > via the standard role mechanism of the accessibility API.
		 */
		if (spec.isAbstract) {
			continue;
		}

		/**
		 * Whether the role is the permitted role according to ARIA in HTML.
		 */
		if (!permittedRoles.some(r => r.name === roleName)) {
			continue;
		}

		/**
		 * > Certain landmark roles require names from authors.
		 * > In situations where an author has not specified names for these landmarks,
		 * > it is considered an authoring error.
		 * > The user agent MUST treat such elements as if no role had been provided.
		 * > If a valid fallback role had been specified,
		 * > or if the element had an implicit ARIA role,
		 * > then user agents would continue to expose that role, instead.
		 */
		if (isLandmarkRole(spec) && !isValidLandmarkRole(el, spec)) {
			continue;
		}

		/**
		 * Otherwise
		 */
		return {
			...spec,
			isImplicit: false,
		};
	}

	return null;
}

function isValidLandmarkRole(el: Element, role: NonNullable<ReturnType<typeof getRoleSpec>>) {
	if (!role.accessibleNameRequired) {
		return true;
	}
	if (role.accessibleNameFromAuthor) {
		if (el.getAttribute('aria-label')) {
			return true;
		}
		const id = el.getAttribute('aria-labelledby');
		if (id && el.ownerDocument.getElementById(id)) {
			return true;
		}
	}
	// The landmark role does not require names from the content
	// if (role.accessibleNameFromContent) {}
	return false;
}

function isLandmarkRole(role: NonNullable<ReturnType<typeof getRoleSpec>>) {
	return role?.superClassRoles.some(su => su.name === 'landmark');
}

function getImplicitRole(specs: Readonly<MLMLSpec>, el: Element, version: ARIAVersion): Role<true> | null {
	const implicitRole = getImplicitRoleName(el, version, specs);
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
