import type { ARIAVersion, ComputedRole, MLMLSpec, RoleComputationError } from '../../types/index.js';
import type { ReadonlyDeep } from 'type-fest';

import { getRoleSpec } from './get-role-spec.js';
import { resolveNamespace } from '../../utils/resolve-namespace.js';

import { getPermittedRoles } from './get-permitted-roles.js';

export function getExplicitRole(
	specs: MLMLSpec,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	version: ARIAVersion,
): ComputedRole {
	const roleValue = el.getAttribute('role');
	const roleNames = roleValue?.toLowerCase().trim().split(/\s+/) ?? [];
	const permittedRoles = getPermittedRoles(el, version, specs);
	const { namespaceURI } = resolveNamespace(el.localName, el.namespaceURI);

	let error: RoleComputationError = 'NO_EXPLICIT';

	/**
	 * Resolve from values and **Handling Author Errors**
	 *
	 * @see https://w3c.github.io/aria/#document-handling_author-errors
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
			error = 'ROLE_NO_EXISTS';
			continue;
		}

		/**
		 * > As stated in the Definition of Roles section,
		 * > it is considered an authoring error to use abstract roles in content.
		 * > User agents MUST NOT map abstract roles
		 * > via the standard role mechanism of the accessibility API.
		 */
		if (spec.isAbstract) {
			error = 'ABSTRACT';
			continue;
		}

		/**
		 * Whether the role is the permitted role according to ARIA in HTML.
		 */
		if (!permittedRoles.some(r => r.name === roleName)) {
			error = 'NO_PERMITTED';
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
			error = 'INVALID_LANDMARK';
			continue;
		}

		/**
		 * Otherwise
		 */
		return {
			el,
			role: {
				...spec,
				isImplicit: false,
			},
		};
	}

	return {
		el,
		role: null,
		errorType: error,
	};
}

function isLandmarkRole(role: ReadonlyDeep<NonNullable<ReturnType<typeof getRoleSpec>>>) {
	return role?.superClassRoles.some(su => su.name === 'landmark');
}

function isValidLandmarkRole(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	role: ReadonlyDeep<NonNullable<ReturnType<typeof getRoleSpec>>>,
) {
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
