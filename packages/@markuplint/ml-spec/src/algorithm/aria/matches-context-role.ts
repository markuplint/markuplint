import type { ARIAVersion, MLMLSpec } from '../../types/index.js';

import { isTransparentForOwnership } from './is-presentational.js';

import { getComputedRole } from './get-computed-role.js';

/**
 * Implements the ARIA "Required Accessibility Parent Role" (called "Required
 * Context Role" in ARIA 1.2). Each condition string describes a chain of
 * ancestor roles separated by ` > ` (e.g., `"list > group"`).
 *
 * TODO: This function only walks the DOM `parentElement` chain and does not
 * consider `aria-owns` relationships. An element referenced by `aria-owns` on
 * a remote ancestor should be treated as if it were an accessibility child of
 * that ancestor. Implementing this requires a document-wide reverse lookup of
 * `aria-owns` attributes, which is a separate architectural concern.
 * See also: `has-required-owned-elements.ts` has a similar limitation.
 */
export function matchesContextRole(
	conditions: readonly string[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	ownedEl: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
) {
	return conditions.some(condition => matchesCondition(condition, ownedEl.parentElement, specs, version));
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
		 * ARIA 1.3 ("Required Accessibility Parent Role"): "To determine
		 * whether an element has a parent with the required role, user agents
		 * MUST ignore any elements with the role `generic` or `none`."
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
			parentEl = parentEl.parentElement;
			continue;
		}

		const condition = conditions.shift()!;

		if (condition !== parentRole?.name) {
			return false;
		}

		parentEl = parentEl.parentElement;
	}

	return true;
}
