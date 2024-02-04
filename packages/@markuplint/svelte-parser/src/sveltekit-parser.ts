import { HtmlParser } from '@markuplint/html-parser';

class SvelteKitTemplateParser extends HtmlParser {
	constructor() {
		super({
			ignoreTags: [
				{
					type: 'sveltekit-placeholder',
					start: '%sveltekit.',
					end: '%',
				},
			],
		});
	}
}

export const parser = new SvelteKitTemplateParser();
