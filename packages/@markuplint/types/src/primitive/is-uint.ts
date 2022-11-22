/**
 * @see https://html.spec.whatwg.org/dev/common-microsyntaxes.html#non-negative-integers
 *
 * @param value
 */
export function isUint(value: string, options?: { gt?: number }) {
	const matched = /^[0-9]+$/.test(value);
	if (matched && options) {
		const n = parseInt(value, 10);
		if (options.gt != null) {
			return isFinite(n) && options.gt < n;
		}
	}
	return matched;
}
