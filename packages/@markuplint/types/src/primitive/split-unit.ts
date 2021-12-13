/**
 *
 * @param value
 * @returns
 */
export function splitUnit(value: string) {
	value = value.trim().toLowerCase();
	const matched = value.match(/(^-?\.[0-9]+|^-?[0-9]+(?:\.[0-9]+(?:e[+-][0-9]+)?)?)([a-z]+$)/i);
	if (!matched) {
		return {
			num: value,
			unit: '',
		};
	}
	const [, num, unit] = matched;
	return {
		num,
		unit,
	};
}
