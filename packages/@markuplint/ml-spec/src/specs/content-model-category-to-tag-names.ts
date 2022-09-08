import type { MLMLSpec } from '../types';
import type { Category } from '../types/permitted-structures';

const cache = new Map<Category, ReadonlyArray<string>>();

export function contentModelCategoryToTagNames(contentModel: Category, def: MLMLSpec['def']): ReadonlyArray<string> {
	const cached = cache.get(contentModel);
	if (cached) {
		return cached;
	}
	const tags: string[] | undefined = def['#contentModels'][contentModel];
	const sortedTag = Object.freeze(tags && Array.isArray(tags) ? tags.sort() : []);
	cache.set(contentModel, sortedTag);
	return sortedTag;
}
