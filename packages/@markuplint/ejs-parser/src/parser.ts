import { HtmlParser } from '@markuplint/html-parser';

class EJSParser extends HtmlParser {
	constructor() {
		super({
			ignoreTags: [
				{
					type: 'ejs-whitespace-slurping',
					start: '<%_',
					end: '%>',
				},
				{
					type: 'ejs-output-value',
					start: '<%=',
					end: '%>',
				},
				{
					type: 'ejs-output-unescaped',
					start: '<%-',
					end: '%>',
				},
				{
					type: 'ejs-comment',
					start: '<%#',
					end: '%>',
				},
				{
					type: 'ejs-scriptlet',
					start: /<%(?!%)/,
					end: '%>',
				},
			],
		});
	}
}

export const parser = new EJSParser();
