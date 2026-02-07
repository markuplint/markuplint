/**
 * Checks whether a string is a valid signed integer.
 *
 * @see https://html.spec.whatwg.org/dev/common-microsyntaxes.html#signed-integers
 *
 * @param value - The string to validate
 * @returns Whether the value is a valid signed integer
 */
export function isInt(value: string) {
	return /^-?\d+$/.test(value);
}
