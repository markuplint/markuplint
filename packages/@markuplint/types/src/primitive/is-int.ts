/**
 * @see https://html.spec.whatwg.org/dev/common-microsyntaxes.html#signed-integers
 *
 * @param value
 */
export function isInt(value: string) {
	return /^-?\d+$/.test(value);
}
