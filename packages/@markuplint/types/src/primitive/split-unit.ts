/**
 * Splits a value string into its numeric and unit parts.
 *
 * @param value - The string to split (e.g., "10px", "1.5em")
 * @returns An object with `num` (the numeric part) and `unit` (the unit suffix, or empty string)
 */
export function splitUnit(value: string) {
	value = value.trim().toLowerCase();
	const matched = value.match(/(^-?\.\d+|^-?\d+(?:\.\d+(?:e[+-]\d+)?)?)([a-z]+$)/i);
	if (!matched) {
		return {
			num: value,
			unit: '',
		};
	}
	const [, num, unit] = matched;
	return {
		num: num ?? value,
		unit: unit ?? '',
	};
}
