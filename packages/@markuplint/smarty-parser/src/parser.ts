import { HtmlParser } from '@markuplint/html-parser';

class SmartyParser extends HtmlParser {
	constructor() {
		super({
			ignoreTags: [
				{
					type: 'smarty-literal',
					start: '{literal}',
					end: '{/literal}',
				},
				{
					type: 'smarty-comment',
					start: '{*',
					end: '*}',
				},
				{
					type: 'smarty-scriptlet',
					start: '{',
					end: '}',
				},
			],
		});
	}
}

export const parser = new SmartyParser();
