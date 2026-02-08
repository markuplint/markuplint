import type { Specificity } from './types.js';

/**
 * Compares two CSS specificity tuples using the standard comparison algorithm.
 * Compares from left (ID) to right (type) component.
 *
 * @param a - The first specificity tuple `[id, class, type]`
 * @param b - The second specificity tuple `[id, class, type]`
 * @returns `-1` if `a` is less specific, `1` if `a` is more specific, `0` if equal
 */
export function compareSpecificity(a: Specificity, b: Specificity) {
	if (a[0] < b[0]) {
		return -1;
	} else if (a[0] > b[0]) {
		return 1;
	} else if (a[1] < b[1]) {
		return -1;
	} else if (a[1] > b[1]) {
		return 1;
	} else if (a[2] < b[2]) {
		return -1;
	} else if (a[2] > b[2]) {
		return 1;
	}
	return 0;
}
