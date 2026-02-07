/**
 * Checks whether a string is a valid non-negative integer.
 *
 * @see https://html.spec.whatwg.org/dev/common-microsyntaxes.html#non-negative-integers
 *
 * @param value - The string to validate
 * @param options - Optional constraints; use `gt` to require a value greater than the specified number
 * @returns Whether the value is a valid non-negative integer within the constraints
 */
export function isUint(value: string, options?: { readonly gt?: number }) {
	const matched = /^\d+$/.test(value);
	if (matched && options) {
		const n = Number.parseInt(value, 10);
		if (options.gt != null) {
			return Number.isFinite(n) && options.gt < n;
		}
	}
	return matched;
}
