import html from '@markuplint/html-ls';

export default function unfoldContentModelsToTags(contentModel: string) {
	const tags: string[] = html.def['#contentModels'][contentModel];
	return tags && Array.from(tags) ? tags : [];
}
