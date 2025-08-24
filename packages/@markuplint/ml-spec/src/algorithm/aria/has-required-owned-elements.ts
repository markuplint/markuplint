import type { ARIAVersion, ComputedRole, MLMLSpec } from '../../types/index.js';

import { isPresentational } from './is-presentational.js';

import { getComputedRole } from './get-computed-role.js';
import { getExplicitRole } from './get-explicit-role.js';
import { getImplicitRole } from './get-implicit-role.js';

export function hasRequiredOwnedElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): boolean {
	/**
	 * The element has aria-owns which means it may have owned elements.
	 *
	 * THIS CONDITION IS PARTIAL SUPPORT.
	 */
	if (el.hasAttribute('aria-owns')) {
		// FIXME
		return true;
	}

	/**
	 * Otherwise, traverses descendants to find owned elements.
	 */
	const computed = getComputedRole(specs, el, version);
	if (!computed.role || computed.role.requiredOwnedElements.length === 0) {
		return true;
	}
	for (const expectRole of computed.role.requiredOwnedElements) {
		for (const owned of getClosestNonPresentationalDescendants(el, specs, version)) {
			if (isRequiredOwnedElement(owned.el, owned.role, expectRole, specs, version)) {
				return true;
			}
		}
	}

	return false;
}

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
 * ⚠ THE SPECIFICATION HAS AN ISSUE
 * that has not decided whether the owned element is a child or a descendant.
 *
 * @see https://github.com/w3c/aria/issues/1033
 * @see https://github.com/w3c/aria/issues/748
 * @see https://github.com/w3c/aria/pull/1162
 * @see https://github.com/w3c/aria/pull/1213
 *
 * Currently, this process interprets that as A CHILD
 * because it wants to be near to HTML semantics.
 * However, the presentational role behaves transparently
 * according to the sample code in WAI-ARIA specification.
 */
function getClosestNonPresentationalDescendants(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
): ComputedRole[] {
	const owned: ComputedRole[] = [];
	for (const child of el.children) {
		const explicitRole = getExplicitRole(specs, child, version);
		const computed = explicitRole.role ? explicitRole : getImplicitRole(specs, child, version);
		if (isPresentational(computed.role?.name)) {
			owned.push(...getClosestNonPresentationalDescendants(child, specs, version));
			continue;
		}
		owned.push({ ...computed, el: child });
	}
	return owned;
}
