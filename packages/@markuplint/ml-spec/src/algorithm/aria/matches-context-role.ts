import type { ARIAVersion, MLMLSpec } from '../../types/index.js';

import { getOwningParentElement } from './aria-owns.js';
import { isTransparentForOwnership } from './is-presentational.js';

import { getComputedRole } from './get-computed-role.js';

/**
 * Implements the ARIA "Required Accessibility Parent Role" (called "Required
 * Context Role" in ARIA 1.2). Each condition string describes a chain of
 * ancestor roles separated by ` > ` (e.g., `"list > group"`).
 *
 * The chain is the one the accessibility tree is built from, which does not have a `slot`, with
 * `aria-owns` resolved ({@link getOwningParentElement}): an element that an `aria-owns` refers to is
 * an accessibility child of the element that refers to it.
 *
 * > If the list is not empty, authors MUST ensure that an element with the current role is an
 * > accessibility child of an element with a role from this list.
 *
 * @see https://w3c.github.io/aria/#scope
 */
export function matchesContextRole(
	conditions: readonly string[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	ownedEl: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
) {
	return conditions.some(condition =>
		matchesCondition(condition, getOwningParentElement(ownedEl, specs, version), specs, version),
	);
}

function matchesCondition(
	condition: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parentEl: Element | null,
	specs: MLMLSpec,
	version: ARIAVersion,
) {
	const conditions = condition.split(/\s+>\s+/).toReversed();

	while (conditions.length > 0) {
		if (!parentEl) {
			return false;
		}

		const parentRole = getComputedRole(specs, parentEl, version, true).role;

		/**
		 * ARIA 1.3 (Required Accessibility Parent Role): to determine whether an
		 * element has a parent with the required role, the user agent ignores the
		 * elements with the role `generic` or `none`.
		 *
		 * `presentation`/`none` are transparent in all ARIA versions to stay
		 * consistent with `getNonPresentationalAncestor` (which already skips
		 * them unconditionally). `generic` is additionally transparent in 1.3+
		 * per the spec.
		 *
		 * While the ARIA 1.1/1.2 specification text does not explicitly define
		 * this transparency for the context role check, applying it is a
		 * pragmatic choice: `getNonPresentationalAncestor` and `classifyChildren`
		 * (for owned elements) already skip `presentation`/`none` in all versions.
		 * Treating the context role check differently would create inconsistent
		 * behavior where a structure is valid from the parent's perspective
		 * (owned elements) but invalid from the child's perspective (context role).
		 *
		 * @see https://w3c.github.io/aria/#scope
		 */
		if (isTransparentForOwnership(parentRole?.name, version)) {
			parentEl = getOwningParentElement(parentEl, specs, version);
			continue;
		}

		const condition = conditions.shift()!;

		if (condition !== parentRole?.name) {
			return false;
		}

		parentEl = getOwningParentElement(parentEl, specs, version);
	}

	return true;
}
