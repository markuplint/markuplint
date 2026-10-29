import type { ARIAVersion, ComputedRole, MLMLSpec, RoleComputationError } from '../../types/index.js';
import type { ReadonlyDeep } from 'type-fest';

import { XHTML_NAMESPACE } from '../../const/index.js';
import { getRoleSpec } from './get-role-spec.js';
import { resolveNamespace } from '../../utils/resolve-namespace.js';

import { getPermittedRoles } from './get-permitted-roles.js';

/**
 * Implements the WAI-ARIA "Handling Author Errors" algorithm.
 *
 * The roles that ARIA in HTML does not permit on the element are authoring
 * errors that the user agent does not correct: such a role is returned with
 * `errorType: 'NO_PERMITTED'` (Core-AAM §3.2), except on an element that is
 * never rendered.
 *
 * @see https://w3c.github.io/aria/#document-handling_author-errors
 * @see https://w3c.github.io/core-aam/#mapping_conflicts
 */
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
		 * A role that ARIA in HTML does not permit on the element is an
		 * authoring error, but user agents still expose it, so the role is
		 * kept and the error is reported alongside. An element that is never
		 * rendered is not in the accessibility tree at all (WAI-ARIA §7.1),
		 * so the role is dropped there.
		 *
		 * @see https://w3c.github.io/aria/#tree_exclusion
		 *
		 * > Elements, including their descendent elements, that have host language semantics specifying that the element is not displayed, such as CSS display:none, visibility:hidden, or the HTML hidden attribute.
		 *
		 * @see https://w3c.github.io/core-aam/#mapping_conflicts
		 *
		 * > While conformance checkers might signal an error or warning when a WAI-ARIA role is used on elements with strong native semantics, user agents MUST still use the value of the semantic of the WAI-ARIA role when exposing the element to accessibility APIs.
		 */
		if (!permittedRoles.some(r => r.name === roleName)) {
			if (isNeverRendered(el, namespaceURI)) {
				error = 'NO_PERMITTED';
				continue;
			}
			return {
				el,
				role: {
					...spec,
					isImplicit: false,
				},
				errorType: 'NO_PERMITTED',
			};
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

/**
 * HTML elements that the user agent style sheet never renders (`display: none`),
 * together with `input[type=hidden]` from the same rules (`isNeverRendered`).
 * `area` is left out: it is rendered through its image map. The rules that
 * depend on state (`[hidden]`, `noscript` with scripting) are left out too: the
 * role stays on such an element, as its `hidden` attribute is a matter of the
 * accessible name computation (Step 2A), not of the role.
 *
 * @see https://html.spec.whatwg.org/multipage/rendering.html#hidden-elements
 */
const NEVER_RENDERED_HTML_ELEMENTS: ReadonlySet<string> = new Set([
	'base',
	'basefont',
	'datalist',
	'head',
	'link',
	'meta',
	'noembed',
	'noframes',
	'param',
	'rp',
	'script',
	'style',
	'template',
	'title',
]);

function isNeverRendered(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	namespaceURI: string,
): boolean {
	if (namespaceURI !== XHTML_NAMESPACE) {
		return false;
	}
	if (NEVER_RENDERED_HTML_ELEMENTS.has(el.localName)) {
		return true;
	}
	return el.localName === 'input' && el.getAttribute('type')?.trim().toLowerCase() === 'hidden';
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
