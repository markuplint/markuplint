export function range(value: string, from: number, to: number) {
	const num = Number.parseFloat(value);
	if (Number.isNaN(num)) {
		return false;
	}
	return from <= num && num <= to;
}
