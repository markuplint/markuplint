/**
 * @see https://html.spec.whatwg.org/dev/common-microsyntaxes.html#non-negative-integers
 *
 * @param value
 */
export function isUint(value: string, opions?: { gt?: number }) {
	const matched = /^[0-9]+$/.test(value);
	if (matched && opions) {
		const n = parseInt(value, 10);
		if (opions.gt != null) {
			return isFinite(n) && opions.gt < n;
		}
	}
	return matched;
}
