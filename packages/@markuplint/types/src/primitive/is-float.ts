/**
 * @see https://html.spec.whatwg.org/dev/common-microsyntaxes.html#floating-point-numbers
 *
 * @param value
 */
export function isFloat(value: string) {
	return value === value.trim() && Number.isFinite(parseFloat(value));
}
