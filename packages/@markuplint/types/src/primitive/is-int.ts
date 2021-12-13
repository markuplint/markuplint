/**
 * @see https://html.spec.whatwg.org/dev/common-microsyntaxes.html#signed-integers
 *
 * @param value
 */
export function isInt(value: string) {
	return /^-?[0-9]+$/.test(value);
}
