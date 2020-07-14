import { ContentModel } from '@markuplint/ml-spec';
import html from '@markuplint/html-spec';

export default function unfoldContentModelsToTags(contentModel: ContentModel) {
	const tags: string[] | undefined = html.def['#contentModels'][contentModel];
	return tags && Array.isArray(tags) ? tags.sort() : [];
}
