import type { MLMLSpec } from '../../types/index.js';
import type { Category } from '../../types/permitted-structures.js';

/**
 * Retrieves the CSS selectors associated with a content model category from the spec definitions.
 * These selectors can be used to match elements that belong to the given category.
 *
 * @param specs - The full markup language specification
 * @param category - The content model category identifier (e.g., `#flow`, `#interactive`)
 * @returns A readonly array of CSS selector strings for the category, or an empty array if the category is not defined
 */
export function getSelectorsByContentModelCategory(specs: MLMLSpec, category: Category): ReadonlyArray<string> {
	const selectors = specs.def['#contentModels'][category];
	return selectors ?? [];
}
