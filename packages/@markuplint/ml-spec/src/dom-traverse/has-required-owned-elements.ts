import type { ARIAVersion, ComputedRole, MLMLSpec } from '../types';

import { isPresentational } from '../specs/is-presentational';

import { getComputedRole } from './get-computed-role';
import { getExplicitRole } from './get-explicit-role';
import { getImplicitRole } from './get-implicit-role';

export function hasRequiredOwnedElement(el: Element, specs: Readonly<MLMLSpec>, version: ARIAVersion): boolean {
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
			if (isRequiredOwnedElement(owned, expectRole, specs, version)) {
				return true;
			}
		}
	}

	return false;
}

export function isRequiredOwnedElement(owned: ComputedRole, query: string, specs: MLMLSpec, version: ARIAVersion) {
	const [baseRole, owningRole] = query.split(' > ') as [string, string | undefined];
	if (owned.role?.name !== baseRole) {
		return false;
	}

	if (!owningRole) {
		return true;
	}

	for (const owning of getClosestNonPresentationalDescendants(owned.el, specs, version)) {
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
function getClosestNonPresentationalDescendants(el: Element, specs: MLMLSpec, version: ARIAVersion): ComputedRole[] {
	const owned: ComputedRole[] = [];
	for (const child of Array.from(el.children)) {
		const implicitRole = getImplicitRole(specs, child, version);
		const explicitRole = getExplicitRole(specs, child, version);
		const computed = explicitRole.role ? explicitRole : implicitRole;
		if (isPresentational(computed.role?.name)) {
			owned.push(...getClosestNonPresentationalDescendants(child, specs, version));
			continue;
		}
		owned.push({ ...computed, el: child });
	}
	return owned;
}
