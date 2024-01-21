import { HtmlParser } from '@markuplint/html-parser';

class ERubyParser extends HtmlParser {
	constructor() {
		super({
			ignoreTags: [
				{
					type: 'erb-ruby-expression',
					start: '<%=',
					end: '%>',
				},
				{
					type: 'erb-comment',
					start: '<%#',
					end: '%>',
				},
				{
					type: 'erb-ruby-code',
					start: /<%(?!%)/,
					end: '%>',
				},
				// TODO: If it use trim_mode.
				// If you need it: https://github.com/markuplint/markuplint/issues/new?assignees=%40YusukeHirao&labels=Features%3A+Proposal&projects=&template=feature.md&title=Supporting+trim_mode+for+erb-parser
				// {
				// 	type: 'erb-ruby-code-line',
				// 	start: /(?:^|\n)\s*%(?!%)/,
				// 	end: /\n|$/
				// }
			],
		});
	}
}

export const parser = new ERubyParser();
