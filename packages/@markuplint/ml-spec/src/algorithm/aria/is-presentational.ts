import type { ARIAVersion } from '../../types/index.js';

/**
 * Determines whether a given role name corresponds to a presentational role
 * (`"presentation"` or `"none"`), which indicates the element should be
 * excluded from the accessibility tree.
 *
 * @param roleName - The ARIA role name to check, or undefined
 * @returns `true` if the role name is `"presentation"` or `"none"`, `false` otherwise
 */
export function isPresentational(roleName?: string) {
	if (!roleName) {
		return false;
	}
	return ['presentation', 'none'].includes(roleName);
}

/**
 * Determines whether a given role is transparent for ownership traversal.
 *
 * **Version behavior:**
 * - **ARIA 1.1/1.2:** Only `presentation`/`none` are transparent.
 *   This matches the pre-existing behavior of `getClosestNonPresentationalDescendants`
 *   and `getNonPresentationalAncestor`.
 * - **ARIA 1.3:** `generic` is additionally transparent per the spec:
 *   "user agents MUST ignore any intervening elements with the role
 *   `generic` or `none`."
 *
 * **Important:** For `matchesContextRole`, the caller gates this function
 * behind a version check (`version !== '1.1' && version !== '1.2'`)
 * because ARIA 1.1/1.2 did not define context role transparency at all.
 *
 * @see https://w3c.github.io/aria/#mustContain
 * @see https://w3c.github.io/aria/#scope
 *
 * @param roleName - The ARIA role name to check, or undefined
 * @param version - The ARIA specification version
 * @returns `true` if the role should be skipped during ownership traversal
 */
export function isTransparentForOwnership(roleName: string | undefined, version: ARIAVersion): boolean {
	if (isPresentational(roleName)) {
		return true;
	}
	if (version === '1.3' && roleName === 'generic') {
		return true;
	}
	return false;
}
