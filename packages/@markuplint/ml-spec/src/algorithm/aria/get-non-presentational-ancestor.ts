import type { ARIAVersion, MLMLSpec } from '../../types/index.js';

import { isPresentational } from './is-presentational.js';

import { getComputedRole } from './get-computed-role.js';

export function getNonPresentationalAncestor(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
) {
	let ancestor: Element | null = el.parentElement;

	/**
	 * In ARIA 1.1 and 1.2, the role of an element is not affected by the role of its ancestor elements.
	 *
	 * It is due to implementation considerations in Markuplint.
	 */
	const assumeSingleNode = version !== '1.1' && version !== '1.2';

	while (ancestor) {
		const ancestorRole = getComputedRole(specs, ancestor, version, assumeSingleNode);
		if (!isPresentational(ancestorRole.role?.name)) {
			return ancestorRole;
		}
		ancestor = ancestor.parentElement;
	}
	return {
		el: ancestor,
		role: null,
	};
}
