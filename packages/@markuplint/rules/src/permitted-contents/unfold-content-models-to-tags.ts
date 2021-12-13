import type { ContentModel } from '@markuplint/ml-spec';

import { def } from '@markuplint/html-spec';

export default function unfoldContentModelsToTags(contentModel: ContentModel) {
	const tags: string[] | undefined = def['#contentModels'][contentModel];
	return tags && Array.isArray(tags) ? tags.sort() : [];
}
