import type { ARIAVersion, MLMLSpec } from '../types';

import { ariaSpecs } from '../specs/aria-specs';
import { getRoleSpec } from '../specs/get-role-spec';
import { getSelectorsByContentModelCategory } from '../specs/get-selectors-by-content-model-category';
import { isPresentational } from '../specs/is-presentational';
import { resolveNamespace } from '../utils/resolve-namespace';

import { getAttrSpecs } from './get-attr-specs';
import { getImplicitRole as getImplicitRoleName } from './get-implicit-role';
import { getNonPresentationalAncestor } from './get-non-presentational-ancestor';
import { getPermittedRoles } from './get-permitted-roles';

type Role<I extends boolean = boolean> = ReturnType<typeof getRoleSpec> & { isImplicit: I };

export function getComputedRole(specs: Readonly<MLMLSpec>, el: Element, version: ARIAVersion): Role | null {
	const implicitRole = getImplicitRole(specs, el, version);
	const explicitRole = getExplicitRole(specs, el, version);
	const role = explicitRole || implicitRole;

	/**
	 * Presentational Roles Conflict Resolution
	 *
	 * @see https://www.w3.org/TR/wai-aria/#conflict_resolution_presentation_none
	 * @see https://w3c.github.io/aria/#conflict_resolution_presentation_none
	 */

	/**
	 * > If the action of exposing the explicit role
	 * > causes the accessibility tree to be malformed,
	 * > the expected results are undefined.
	 *
	 * Determines whether the context is valid.
	 * ⚠ THE SPECIFICATION HAS AN ISSUE
	 * that has not decided whether the context is a parent or an ancestor.
	 *
	 * @see https://github.com/w3c/aria/issues/1033
	 * @see https://github.com/w3c/aria/issues/748
	 * @see https://github.com/w3c/aria/pull/1162
	 * @see https://github.com/w3c/aria/pull/1213
	 *
	 * Currently, this process interprets that as A PARENT
	 * because it wants to be near to HTML semantics.
	 * However, the presentational role behaves transparently
	 * according to the sample code in WAI-ARIA specification.
	 */
	const nonPresentationalAncestor = getNonPresentationalAncestor(el, specs, version);
	if (role?.requiredContextRole.length) {
		if (!nonPresentationalAncestor) {
			return null;
		}
		if (!role?.requiredContextRole.includes(nonPresentationalAncestor.name)) {
			return null;
		}
	}

	if (role && !isPresentational(role.name)) {
		return role;
	}

	/**
	 * > If an element is focusable,
	 * > user agents MUST ignore the presentation/none role
	 * > and expose the element with its implicit role,
	 * > in order to ensure that the element is operable.
	 *
	 * With the issue: What does focusable or otherwise interactive mean](https://github.com/w3c/aria/issues/1192)
	 *
	 * - Focus: https://html.spec.whatwg.org/multipage/interaction.html#focus
	 * - Interactive content: https://html.spec.whatwg.org/multipage/dom.html#interactive-content
	 */
	if (
		/**
		 * Interactive element
		 */
		[
			/**
			 * Interactive content
			 *
			 * THIS CONDITION(SELECTORS) IS ALMOST MEANINGLESS.
			 * Because it has already been determined that
			 * the interactive elements can not specify the presentational role
			 * in the previous processing that computes the permitted role (`getExplicitRole`).
			 *
			 * @see  https://html.spec.whatwg.org/multipage/dom.html#interactive-content
			 */
			...getSelectorsByContentModelCategory(specs, '#interactive'),
			/**
			 * Interaction
			 *
			 * @see  https://html.spec.whatwg.org/multipage/interaction.html
			 */
			'[tabindex]',
			'[contenteditable]:not([contenteditable="false" i])',
		].some(selector => el.matches(selector)) &&
		/**
		 * No disabled
		 */
		!someAncestors(el, p => isEnabledAttr(p, specs, 'disabled')) &&
		/**
		 * No inert
		 */
		!someAncestors(el, p => isEnabledAttr(p, specs, 'inert')) &&
		/**
		 * No hidden
		 */
		!someAncestors(el, p => isEnabledAttr(p, specs, 'hidden'))
	) {
		return implicitRole;
	}

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

/**
 * The attribute is available in its owner element,
 * it has the attribute.
 */
function isEnabledAttr(el: Element, specs: MLMLSpec, attrName: string) {
	const attrs = getAttrSpecs(el, specs);
	const attr = attrs?.find(attr => attr.name === attrName);
	return !!attr && el.hasAttribute(attrName);
}

/**
 * Determines whether some ancestors match the condition that the specified callback function.
 */
function someAncestors(el: Element, predicate: (ancestor: Element) => boolean) {
	const list: Element[] = [];
	let current: Element | null = el;
	while (current) {
		list.push(current);
		current = current.parentElement;
	}
	return list.some(predicate);
}
