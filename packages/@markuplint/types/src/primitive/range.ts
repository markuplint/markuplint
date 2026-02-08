/**
 * Checks whether a numeric string value falls within an inclusive range.
 *
 * @param value - The string to parse as a number and validate
 * @param from - The minimum allowed value (inclusive)
 * @param to - The maximum allowed value (inclusive)
 * @returns Whether the parsed number is within the range `[from, to]`
 */
export function range(value: string, from: number, to: number) {
	const num = Number.parseFloat(value);
	if (Number.isNaN(num)) {
		return false;
	}
	return from <= num && num <= to;
}
