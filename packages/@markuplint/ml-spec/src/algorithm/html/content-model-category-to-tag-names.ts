import type { MLMLSpec } from '../../types/index.js';
import type { Category } from '../../types/permitted-structures.js';

const cache = new Map<Category, ReadonlyArray<string>>();

/**
 * Converts a content model category (e.g., `#flow`, `#phrasing`) to a sorted,
 * frozen array of HTML/SVG tag names that belong to that category.
 * Results are cached for repeated lookups.
 *
 * @param contentModel - The content model category identifier
 * @param def - The specification definitions containing content model mappings
 * @returns A frozen, sorted array of tag name strings belonging to the category
 */
export function contentModelCategoryToTagNames(contentModel: Category, def: MLMLSpec['def']): ReadonlyArray<string> {
	const cached = cache.get(contentModel);
	if (cached) {
		return cached;
	}
	let tags: readonly string[] | undefined = def['#contentModels'][contentModel];
	if (!tags) {
		// Case-insensitive fallback for mixed-case categories (e.g., #MathMLPresentation, #SVGAnimation)
		const lowerKey = contentModel.toLowerCase();
		for (const key of Object.keys(def['#contentModels'])) {
			if (key.toLowerCase() === lowerKey) {
				tags = def['#contentModels'][key as Category];
				break;
			}
		}
	}
	const sortedTag = Object.freeze(tags && Array.isArray(tags) ? tags.toSorted() : []);
	cache.set(contentModel, sortedTag);
	return sortedTag;
}
