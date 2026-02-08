import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for ERB (Embedded Ruby) templates that extends the standard HTML parser.
 *
 * Configures the HTML parser to recognize ERB tag variants as opaque blocks:
 * - `<%= ... %>` (Ruby expression output)
 * - `<%# ... %>` (comments)
 * - `<% ... %>` (Ruby code execution)
 *
 * Note: trim_mode (`%`-prefixed lines) is not currently supported.
 */
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

/**
 * Singleton ERB parser instance for use by the markuplint engine.
 */
export const parser = new ERubyParser();
