/**
 * Intentionally looser than the strict WHATWG grammar: `Number.parseFloat()`
 * accepts leading-dot values (`.5`) and ignores trailing non-numeric
 * characters (`1.5abc`), both of which the spec production rejects.
 *
 * @see https://html.spec.whatwg.org/dev/common-microsyntaxes.html#floating-point-numbers
 */
export function isFloat(value: string) {
	return value === value.trim() && Number.isFinite(Number.parseFloat(value));
}
