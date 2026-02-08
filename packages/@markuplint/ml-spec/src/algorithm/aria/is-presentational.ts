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
