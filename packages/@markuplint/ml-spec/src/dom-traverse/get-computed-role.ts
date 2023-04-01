import type { ARIAVersion, ComputedRole, MLMLSpec } from '../types';

import { ariaSpecs } from '../specs/aria-specs';
import { isPresentational } from '../specs/is-presentational';

import { getAttrSpecs } from './get-attr-specs';
import { getExplicitRole } from './get-explicit-role';
import { getImplicitRole } from './get-implicit-role';
import { getNonPresentationalAncestor } from './get-non-presentational-ancestor';
import { isRequiredOwnedElement } from './has-required-owned-elements';
import { mayBeFocusable } from './may-be-focusable';

export function getComputedRole(
	specs: MLMLSpec,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	version: ARIAVersion,
): ComputedRole {
	const implicitRole = getImplicitRole(specs, el, version);
	const explicitRole = getExplicitRole(specs, el, version);
	const computedRole = explicitRole.role ? explicitRole : implicitRole;

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
	if (computedRole.role && computedRole.role.requiredContextRole.length > 0) {
		const nonPresentationalAncestor = getNonPresentationalAncestor(el, specs, version);
		if (!nonPresentationalAncestor.role) {
			return {
				el,
				role: null,
				errorType: 'NO_OWNER',
			};
		}
		if (!computedRole.role?.requiredContextRole.includes(nonPresentationalAncestor.role.name)) {
			return {
				el,
				role: null,
				errorType: 'INVALID_REQUIRED_CONTEXT_ROLE',
			};
		}
	}

	if (computedRole.role && !isPresentational(computedRole.role.name)) {
		return computedRole;
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
		 * If interactive element
		 *
		 * 1. It may be focusable
		 *
		 * THIS CONDITION IS ALMOST MEANINGLESS.
		 * Because it has already been determined that
		 * the interactive elements can not specify the presentational role
		 * in the previous processing that computes the permitted role (`getExplicitRole`).
		 */
		mayBeFocusable(el, specs) &&
		/**
		 * 2. No disabled
		 */
		!someAncestors(el, p => isEnabledAttr(p, specs, 'disabled')) &&
		/**
		 * 3. No inert
		 */
		!someAncestors(el, p => isEnabledAttr(p, specs, 'inert')) &&
		/**
		 * 4. No hidden
		 */
		!someAncestors(el, p => isEnabledAttr(p, specs, 'hidden'))
	) {
		return {
			...implicitRole,
			errorType: 'INTERACTIVE_ELEMENT_MUST_NOT_BE_PRESENTATIONAL',
		};
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
	if (explicitRole.role) {
		const nonPresentationalAncestor = getNonPresentationalAncestor(el, specs, version);
		if (nonPresentationalAncestor.role && nonPresentationalAncestor.role?.requiredOwnedElements.length > 0) {
			if (
				nonPresentationalAncestor.role.requiredOwnedElements.some(expected => {
					// const ancestor = nonPresentationalAncestor.el;
					// const ancestorImplicitRole = getImplicitRole(specs, ancestor, version);
					// console.log({ nonPresentationalAncestor, ancestorImplicitRole });
					return isRequiredOwnedElement(implicitRole.el, implicitRole.role, expected, specs, version);
				})
			) {
				return {
					...implicitRole,
					errorType: 'REQUIRED_OWNED_ELEMENT_MUST_NOT_BE_PRESENTATIONAL',
				};
			}
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
			return {
				...implicitRole,
				errorType: 'GLOBAL_PROP_MUST_NOT_BE_PRESENTATIONAL',
			};
		}
	}

	return computedRole;
}

/**
 * The attribute is available in its owner element,
 * it has the attribute.
 */
function isEnabledAttr(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	attrName: string,
) {
	const attrs = getAttrSpecs(el, specs);
	const attr = attrs?.find(attr => attr.name === attrName);
	return !!attr && el.hasAttribute(attrName);
}

/**
 * Determines whether some ancestors match the condition that the specified callback function.
 */
function someAncestors(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	predicate: (
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		ancestor: Element,
	) => boolean,
) {
	const list: Element[] = [];
	let current: Element | null = el;
	while (current) {
		list.push(current);
		current = current.parentElement;
	}
	return list.some(predicate);
}
