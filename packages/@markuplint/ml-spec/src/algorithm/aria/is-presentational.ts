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
 * Determines whether a given role is transparent for ownership/context
 * traversal. In ARIA 1.3, `generic` role elements are transparent in
 * addition to `presentation`/`none` when determining parent-child
 * relationships for required owned elements and required context roles.
 *
 * @see https://w3c.github.io/aria/#tree_exclusion
 *
 * @param roleName - The ARIA role name to check, or undefined
 * @param version - The ARIA specification version
 * @returns `true` if the role should be skipped during ownership/context traversal
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
