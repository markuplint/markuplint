/**
 * Checks whether a string is a valid floating-point number.
 *
 * @see https://html.spec.whatwg.org/dev/common-microsyntaxes.html#floating-point-numbers
 *
 * @param value - The string to validate
 * @returns Whether the value is a valid floating-point number
 */
export function isFloat(value: string) {
	return value === value.trim() && Number.isFinite(Number.parseFloat(value));
}
