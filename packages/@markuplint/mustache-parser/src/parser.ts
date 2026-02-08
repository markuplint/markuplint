import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for Mustache and Handlebars templates that extends the standard HTML parser.
 *
 * Configures the HTML parser to recognize Mustache/Handlebars tag variants as opaque blocks:
 * - `{{! ... }}` (comments)
 * - `{{{ ... }}}` (unescaped / triple-stache output)
 * - `{{ ... }}` (standard interpolation and block helpers)
 */
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

/**
 * Singleton Mustache/Handlebars parser instance for use by the markuplint engine.
 */
export const parser = new MustacheParser();
