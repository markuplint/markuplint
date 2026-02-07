/**
 * Checks whether a string is a valid non-negative integer greater than zero.
 *
 * @param value - The string to validate
 * @returns Whether the value is a valid non-zero unsigned integer
 */
export function isNonZeroUint(value: string) {
	return /^\d+$/.test(value) && !/^0+$/.test(value);
}
