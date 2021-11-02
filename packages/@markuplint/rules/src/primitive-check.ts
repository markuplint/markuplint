/**
 * @see https://html.spec.whatwg.org/dev/common-microsyntaxes.html#signed-integers
 *
 * @param value
 */
export function intCheck(value: string) {
	return /^-?[0-9]+$/.test(value);
}

/**
 * @see https://html.spec.whatwg.org/dev/common-microsyntaxes.html#non-negative-integers
 *
 * @param value
 */
export function uintCheck(value: string) {
	return /^[0-9]+$/.test(value);
}

/**
 * @see https://html.spec.whatwg.org/dev/common-microsyntaxes.html#floating-point-numbers
 *
 * @param value
 */
export function floatCheck(value: string) {
	return value === value.trim() && Number.isFinite(parseFloat(value));
}

/**
 * Non-negative integer greater than zero
 *
 * @param value
 */
export function nonZeroUintCheck(value: string) {
	return /^[0-9]+$/.test(value) && !/^0+$/.test(value);
}

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

/**
 *
 * @param value
 * @param units
 * @param numberType
 */
export function numberCheckWithUnit(value: string, units: string[], numberType: 'int' | 'uint' | 'float' = 'float') {
	const { num, unit } = splitUnit(value);
	if (!units.includes(unit.toLowerCase())) {
		return false;
	}
	switch (numberType) {
		case 'int': {
			if (!intCheck(num)) {
				return false;
			}
			break;
		}
		case 'uint': {
			if (!uintCheck(num)) {
				return false;
			}
			break;
		}
		case 'float': {
			if (!floatCheck(num)) {
				return false;
			}
			break;
		}
	}
	return true;
}
