import type { MLMLSpec } from '../types';
import type { Category } from '../types/permitted-structures';
import type { ReadonlyDeep } from 'type-fest';

export function getSelectorsByContentModelCategory(
	specs: ReadonlyDeep<MLMLSpec>,
	category: Category,
): ReadonlyArray<string> {
	const selectors = specs.def['#contentModels'][category];
	return selectors || [];
}
