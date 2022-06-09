import type { Category } from '@markuplint/ml-spec';

import { def } from '@markuplint/html-spec';

export default function unfoldContentModelsToTags(contentModel: Category) {
	const tags: string[] | undefined = def['#contentModels'][contentModel];
	return tags && Array.isArray(tags) ? tags.sort() : [];
}
