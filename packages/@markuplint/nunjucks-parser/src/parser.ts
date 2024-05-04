import { HtmlParser } from '@markuplint/html-parser';

class NunjucksParser extends HtmlParser {
	constructor() {
		super({
			ignoreTags: [
				{
					type: 'nunjucks-block',
					start: '{%',
					end: '%}',
				},
				{
					type: 'nunjucks-output',
					start: '{{',
					end: '}}',
				},
				{
					type: 'nunjucks-comment',
					start: '{#',
					end: '#}',
				},
			],
		});
	}
}

export const parser = new NunjucksParser();
