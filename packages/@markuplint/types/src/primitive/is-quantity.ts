import { isFloat } from './is-float.js';
import { isInt } from './is-int.js';
import { isUint } from './is-uint.js';
import { splitUnit } from './split-unit.js';

/**
 * Checks whether a string is a valid number with one of the allowed unit suffixes.
 *
 * @param value - The string to validate (e.g., "10px", "1.5em")
 * @param units - The allowed unit suffixes (e.g., `["px", "em", "rem"]`)
 * @param numberType - The number format constraint: `"int"`, `"uint"`, or `"float"` (defaults to `"float"`)
 * @returns Whether the value is a valid quantity with an allowed unit
 */
export function isQuantity(value: string, units: readonly string[], numberType: 'int' | 'uint' | 'float' = 'float') {
	const { num, unit } = splitUnit(value);
	if (!units.includes(unit.toLowerCase())) {
		return false;
	}
	switch (numberType) {
		case 'int': {
			if (!isInt(num)) {
				return false;
			}
			break;
		}
		case 'uint': {
			if (!isUint(num)) {
				return false;
			}
			break;
		}
		case 'float': {
			if (!isFloat(num)) {
				return false;
			}
			break;
		}
	}
	return true;
}
