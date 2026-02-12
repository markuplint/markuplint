import type { ARIAVersion, MLMLSpec } from '../../types/index.js';

import { isTransparentForOwnership } from './is-presentational.js';

import { getComputedRole } from './get-computed-role.js';

/**
 * Checks whether an element's parent hierarchy satisfies at least one of the
 * required context role conditions. Each condition string may describe a chain
 * of ancestor roles separated by ` > ` (e.g., `"list > group"`).
 *
 * @param conditions - An array of required context role condition strings to match against
 * @param ownedEl - The owned DOM element whose parent context is being validated
 * @param specs - The full markup language specification
 * @param version - The ARIA specification version to use
 * @returns `true` if any of the context role conditions are satisfied by the element's ancestors
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
		 * In ARIA 1.3, elements with `generic` role (e.g., `<div>`, `<span>`)
		 * are transparent for required context role matching.
		 * Skip them without consuming the condition token.
		 *
		 * @see https://w3c.github.io/aria/#tree_exclusion
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
