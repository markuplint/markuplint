import type { MLMLSpec } from '../../types/index.js';
import type { Category } from '../../types/permitted-structures.js';

export function getSelectorsByContentModelCategory(specs: MLMLSpec, category: Category): ReadonlyArray<string> {
	const selectors = specs.def['#contentModels'][category];
	return selectors ?? [];
}
