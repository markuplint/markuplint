import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for Mustache and Handlebars templates that extends the standard HTML parser.
 *
 * Configures the HTML parser to recognize Mustache/Handlebars tag variants as opaque blocks:
 * - `{{! ... }}` (comments)
 * - `{{{ ... }}}` (unescaped / triple-stache output)
 * - `{{ ... }}` (standard interpolation and block helpers)
 *
 * Handlebars is supported by the same configuration because it is a superset of Mustache
 * and uses the same delimiter syntax.
 *
 * Known limitation: template expressions inside unquoted attribute values are not
 * supported. This limitation is shared by all template engine parsers.
 *
 * @see https://github.com/markuplint/markuplint/issues/240
 * @see https://markuplint.dev/docs/guides/besides-html
 */
class MustacheParser extends HtmlParser {
	constructor() {
		super({
			// The entry order matters: more specific start delimiters must appear
			// before less specific ones because patterns are matched in array order.
			// If `{{!` or `{{{` came after `{{`, comments and triple-stache output
			// would be misclassified as `mustache-tag`.
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
