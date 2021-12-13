/**
 * Non-negative integer greater than zero
 *
 * @param value
 */
export function isNonZeroUint(value: string) {
	return /^[0-9]+$/.test(value) && !/^0+$/.test(value);
}
