import html from '@markuplint/html-ls';

export default function unfoldContentModelsToTags(contentModel: string) {
	const tags: string[] | undefined = html.def['#contentModels'][contentModel];
	return tags && Array.isArray(tags) ? tags.sort() : [];
}
