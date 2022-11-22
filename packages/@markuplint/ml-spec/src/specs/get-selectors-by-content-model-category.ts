import type { MLMLSpec } from '../types';
import type { Category } from '../types/permitted-structures';

export function getSelectorsByContentModelCategory(
	specs: Readonly<MLMLSpec>,
	category: Category,
): ReadonlyArray<string> {
	const selectors = specs.def['#contentModels'][category];
	return selectors || [];
}
