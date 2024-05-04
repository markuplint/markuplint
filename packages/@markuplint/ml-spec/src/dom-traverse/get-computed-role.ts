import type { ARIAVersion, ComputedRole, MLMLSpec } from '../types/index.js';

import { ariaSpecs } from '../specs/aria-specs.js';
import { isPresentational } from '../specs/is-presentational.js';

import { getAccname } from './accname-computation.js';
import { getAttrSpecs } from './get-attr-specs.js';
import { getExplicitRole } from './get-explicit-role.js';
import { getImplicitRole } from './get-implicit-role.js';
import { getNonPresentationalAncestor } from './get-non-presentational-ancestor.js';
import { isRequiredOwnedElement } from './has-required-owned-elements.js';
import { matchesContextRole } from './matches-context-role.js';
import { mayBeFocusable } from './may-be-focusable.js';

export function getComputedRole(
	specs: MLMLSpec,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	version: ARIAVersion,
	assumeSingleNode = false,
): ComputedRole {
	let lazyImplicitRole: ComputedRole | undefined;
	const explicitRole = getExplicitRole(specs, el, version);
	const computedRole = explicitRole.role
		? explicitRole
		: {
				...(lazyImplicitRole = getImplicitRole(specs, el, version)),
				errorType: explicitRole.errorType === 'NO_EXPLICIT' ? undefined : explicitRole.errorType,
			};

	if (assumeSingleNode) {
		return {
			...computedRole,
			errorType: 'NO_OWNER',
		};
	}

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
		/**
		 * An element fragment that serves as the root without a parent element
		 * cannot satisfy the "Required Context Role" condition.
		 * Therefore, under normal circumstances, the `role` will disappear.
		 * However, in this specific case, it will fall back to both explicit
		 * and implicit roles. Note that the explicit role takes precedence.
		 */
		if (el.parentElement === null) {
			return {
				...computedRole,
				errorType: 'NO_OWNER',
			};
		}

		const nonPresentationalAncestor = getNonPresentationalAncestor(el, specs, version);
		if (!nonPresentationalAncestor.role) {
			return {
				el,
				role: null,
				errorType: 'NO_OWNER',
			};
		}
		if (!matchesContextRole(computedRole.role.requiredContextRole, el, specs, version)) {
			return {
				el,
				role: null,
				errorType: 'INVALID_REQUIRED_CONTEXT_ROLE',
			};
		}
	}

	/**
	 * SVG: Including Elements in the Accessibility Tree
	 *
	 * > Many SVG elements—although rendered to the screen—
	 * > do not have an intrinsic semantic meaning. Instead,
	 * > they represent components of the visual presentation of the document.
	 * > To simplify the accessible representation of the document,
	 * > these purely presentational elements should normally be omitted
	 * > from the accessibility tree, unless the author explicitly provides semantic content.
	 * >
	 * > However, any rendered SVG element may have semantic meaning.
	 * > Authors indicate the significance of the element
	 * > by including alternative text content or WAI-ARIA attributes.
	 * > This section defines the rules for including normally-omitted elements
	 * > in the accessibility tree.
	 * >
	 * > The following graphical and container elements
	 * > in the SVG namespace SHOULD NOT be included in the accessibility tree,
	 * > except as described in this section:
	 * >
	 * > - shape elements (circle, ellipse, line, path, polygon, polyline, rect)
	 * > - the use element
	 * > - the grouping (g) element
	 * > - the image element
	 * > - the mesh element
	 * > - text formatting elements (textPath, tspan)
	 * > - the foreignObject element
	 *
	 * @see https://www.w3.org/TR/svg-aam-1.0/#include_elements
	 */
	if (
		// It doesn't been specified a valid explicit role.
		(explicitRole.role === null || explicitRole.errorType != null) &&
		// It is an SVG element.
		el.namespaceURI === 'http://www.w3.org/2000/svg'
	) {
		const accname =
			getAccname(el).trim() ||
			[...el.children].find(child => ['title', 'desc'].includes(child.localName))?.textContent?.trim();

		if (!accname) {
			return {
				el,
				role: null,
			};
		}
	}

	if (computedRole.role && !isPresentational(computedRole.role.name)) {
		return computedRole;
	}

	const implicitRole = lazyImplicitRole ?? getImplicitRole(specs, el, version);

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
		if (
			nonPresentationalAncestor.role &&
			nonPresentationalAncestor.role?.requiredOwnedElements.length > 0 &&
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
	for (const attr of el.attributes) {
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
