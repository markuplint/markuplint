import { isFloat } from './is-float.js';
import { isInt } from './is-int.js';
import { isUint } from './is-uint.js';
import { splitUnit } from './split-unit.js';

/**
 *
 * @param value
 * @param units
 * @param numberType
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
