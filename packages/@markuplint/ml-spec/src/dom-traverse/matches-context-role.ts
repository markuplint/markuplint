import type { ARIAVersion, MLMLSpec } from '../types/index.js';

import { getComputedRole } from './get-computed-role.js';

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

		const condition = conditions.shift()!;
		const parentRole = getComputedRole(specs, parentEl, version, true).role;

		if (condition !== parentRole?.name) {
			return false;
		}

		parentEl = parentEl.parentElement;
	}

	return true;
}
