/**
 * Non-negative integer greater than zero
 *
 * @param value
 */
export function isNonZeroUint(value: string) {
	return /^\d+$/.test(value) && !/^0+$/.test(value);
}
