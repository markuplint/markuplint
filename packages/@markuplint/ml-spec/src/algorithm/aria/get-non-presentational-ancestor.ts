import type { ARIAVersion, MLMLSpec } from '../../types/index.js';

import { getOwningParentElement } from './aria-owns.js';
import { isTransparentForOwnership } from './is-presentational.js';

import { getComputedRole } from './get-computed-role.js';

/**
 * In ARIA 1.3, `generic` role elements are additionally transparent for
 * ownership traversal.
 *
 * The ancestors are those of the accessibility tree with `aria-owns` resolved: see {@link getOwningParentElement}.
 */
export function getNonPresentationalAncestor(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	version: ARIAVersion,
) {
	let ancestor: Element | null = getOwningParentElement(el, specs, version);

	/**
	 * In ARIA 1.1 and 1.2, the role of an element is not affected by the role of its ancestor elements.
	 *
	 * It is due to implementation considerations in Markuplint.
	 */
	const assumeSingleNode = version !== '1.1' && version !== '1.2';

	while (ancestor) {
		const ancestorRole = getComputedRole(specs, ancestor, version, assumeSingleNode);
		if (!isTransparentForOwnership(ancestorRole.role?.name, version)) {
			return ancestorRole;
		}
		ancestor = getOwningParentElement(ancestor, specs, version);
	}
	return {
		el: ancestor,
		role: null,
	};
}
