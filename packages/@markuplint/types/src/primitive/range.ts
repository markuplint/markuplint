/**
 * It is in the range between `from` and `to`.
 *
 * @param value
 * @param from
 * @param to
 */
export function range(value: string, from: number, to: number) {
	const num = parseFloat(value);
	if (isNaN(num)) {
		return false;
	}
	return from <= num && num <= to;
}
