import { HtmlParser } from '@markuplint/html-parser';

class LiquidParser extends HtmlParser {
	constructor() {
		super({
			ignoreTags: [
				{
					type: 'liquid-block',
					start: '{%',
					end: '%}',
				},
				{
					type: 'liquid-output',
					start: '{{',
					end: '}}',
				},
			],
		});
	}
}

export const parser = new LiquidParser();
