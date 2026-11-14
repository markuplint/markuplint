import type { ARIAVersion, ComputedRole, MLMLSpec } from '../../types/index.js';

import { getOwnedChildElements } from './aria-owns.js';
import { isTransparentForOwnership } from './is-presentational.js';

import { getComputedRole } from './get-computed-role.js';
import { getExplicitRole } from './get-explicit-role.js';
import { getImplicitRole } from './get-implicit-role.js';

/**
 * Checks whether an element satisfies the "Allowed Accessibility Child Roles"
 * constraint (called "Required Owned Elements" in ARIA 1.2)
 * defined by its computed ARIA role. An element satisfies this constraint if any
 * of its closest non-presentational descendants match the required owned element
 * roles. The descendants are those of the accessibility tree with `aria-owns`
 * resolved ({@link getOwnedChildElements}): the elements that its `aria-owns`
 * refers to are among them, and a child that another element owns through
 * `aria-owns` is not. An `aria-owns` whose value is not known until it is rendered
 * (`isDynamicValue` of the attribute that `@markuplint/ml-core` hands over) may own any
 * element, so the element is taken to satisfy the constraint.
 *
 * @param el - The DOM element to check
 * @param specs - The full markup language specification
 * @param version - The ARIA specification version to use
 * @returns `true` if the element has no required owned elements or the constraint is satisfied, `false` otherwise
 * @see https://w3c.github.io/aria/#aria-owns
 */
export function hasRequiredOwnedElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): boolean {
	const ariaOwns = el.getAttributeNode('aria-owns') as (Attr & { isDynamicValue?: boolean; isAbsent?: true }) | null;
	if (ariaOwns && !ariaOwns.isAbsent && ariaOwns.isDynamicValue) {
		return true;
	}

	const computed = getComputedRole(specs, el, version);
	if (!computed.role || computed.role.allowedAccessibilityChildRoles.length === 0) {
		return true;
	}
	for (const expectRole of computed.role.allowedAccessibilityChildRoles) {
		for (const owned of getClosestNonPresentationalDescendants(el, specs, version)) {
			if (isRequiredOwnedElement(owned.el, owned.role, expectRole, specs, version)) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Determines whether an element with a given role matches a required owned element query.
 * The query string may describe a single role or a parent-child relationship using `>` notation
 * (e.g., `"listitem"` or `"group > listitem"`).
 *
 * @param el - The DOM element to test
 * @param role - The computed role of the element
 * @param query - The required owned element query string, optionally containing `>` for nested requirements
 * @param specs - The full markup language specification
 * @param version - The ARIA specification version to use
 * @returns `true` if the element and its role match the required owned element query
 */
export function isRequiredOwnedElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	role: ComputedRole['role'],
	query: string,
	specs: MLMLSpec,
	version: ARIAVersion,
) {
	const [baseRole, owningRole] = query.split(' > ') as [string, string | undefined];
	if (role?.name !== baseRole) {
		return false;
	}

	if (!owningRole) {
		return true;
	}

	for (const owning of getClosestNonPresentationalDescendants(el, specs, version)) {
		if (owning.role?.name === owningRole) {
			return true;
		}
	}

	return false;
}

/**
 * Gets the list of closest non-presentational descendants.
 * This corresponds to the "Allowed Accessibility Child Roles" validation
 * (called "Required Owned Elements" in ARIA 1.2).
 *
 * In ARIA 1.1/1.2, the spec had not decided whether the owned element
 * is a child or a descendant. This implementation interprets that as
 * A CHILD, but `presentation`/`none` elements are treated as transparent.
 *
 * ARIA 1.3 formally resolves this with the definitions of
 * "accessibility child" and "accessibility parent", and additionally
 * makes `generic` elements transparent.
 *
 * @see https://w3c.github.io/aria/#mustContain
 * @see https://github.com/w3c/aria/issues/1033
 * @see https://github.com/w3c/aria/pull/1454
 */
function getClosestNonPresentationalDescendants(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): ComputedRole[] {
	const owned: ComputedRole[] = [];
	for (const child of getOwnedChildElements(el, specs, version)) {
		const explicitRole = getExplicitRole(specs, child, version);
		const computed = explicitRole.role ? explicitRole : getImplicitRole(specs, child, version);
		if (isTransparentForOwnership(computed.role?.name, version)) {
			owned.push(...getClosestNonPresentationalDescendants(child, specs, version));
			continue;
		}
		owned.push({ ...computed, el: child });
	}
	return owned;
}
