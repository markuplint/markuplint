import { HtmlParser } from '@markuplint/html-parser';

class MustacheParser extends HtmlParser {
	constructor() {
		super({
			ignoreTags: [
				{
					type: 'mustache-comment',
					start: '{{!',
					end: '}}',
				},
				{
					type: 'mustache-unescaped',
					start: '{{{',
					end: '}}}',
				},
				{
					type: 'mustache-tag',
					start: '{{',
					end: '}}',
				},
			],
		});
	}
}

export const parser = new MustacheParser();
