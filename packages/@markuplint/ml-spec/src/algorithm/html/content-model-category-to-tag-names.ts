import type { MLMLSpec } from '../../types/index.js';
import type { Category } from '../../types/permitted-structures.js';

/**
 * The answer depends on the `#contentModels` it is read from, which differs between the base spec and a spec
 * merged with an `ExtendedSpec` that adds to it, so each map is cached on its own. How long a map lives, and so
 * how warm the cache stays, is described at `schemaToSpec`.
 */
const caches = new WeakMap<object, Map<Category, ReadonlyArray<string>>>();

/**
 * Converts a content model category (e.g., `#flow`, `#phrasing`) to a sorted,
 * frozen array of HTML/SVG tag names that belong to that category.
 * Results are cached for repeated lookups.
 *
 * Note: entries are returned as stored in the spec's `#contentModels` map
 * without CSS selector parsing. Besides bare tag names they include selectors
 * (`a[href]`, `hgroup:has(h1,h2,h3,h4,h5,h6)`, `style:first-child`), which are
 * not decomposed into tag names; `#custom` and `#text` stand for custom elements
 * and text. An entry ending in `:first-child` holds as the first child as the HTML
 * Standard counts it, text included, which markuplint's own paths match with
 * `contentModelFirstChildBase` and `isContentModelFirstChild` of
 * `@markuplint/selector`; matched as a plain selector, it counts elements only.
 *
 * @param contentModel - The content model category identifier
 * @param def - The specification definitions containing content model mappings
 * @returns A frozen, sorted array of tag name strings belonging to the category
 */
export function contentModelCategoryToTagNames(contentModel: Category, def: MLMLSpec['def']): ReadonlyArray<string> {
	const models = def['#contentModels'];
	let cache = caches.get(models);
	if (!cache) {
		cache = new Map();
		caches.set(models, cache);
	}
	const cached = cache.get(contentModel);
	if (cached) {
		return cached;
	}
	let tags: readonly string[] | undefined = models[contentModel];
	if (!tags) {
		// Case-insensitive fallback for mixed-case categories (e.g., #MathMLPresentation, #SVGAnimation)
		const lowerKey = contentModel.toLowerCase();
		for (const key of Object.keys(models)) {
			if (key.toLowerCase() === lowerKey) {
				tags = models[key as Category];
				break;
			}
		}
	}
	const sortedTag = Object.freeze(tags && Array.isArray(tags) ? tags.toSorted() : []);
	cache.set(contentModel, sortedTag);
	return sortedTag;
}
