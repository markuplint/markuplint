import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for Nunjucks templates that extends the standard HTML parser.
 *
 * Configures the HTML parser to recognize Nunjucks tag variants as opaque blocks:
 * - `{% ... %}` (block tags such as if, for, macro)
 * - `{{ ... }}` (output / variable interpolation)
 * - `{# ... #}` (comments)
 *
 * Known limitation: Nunjucks expressions inside unquoted attribute values are
 * not supported. This limitation is shared by all template engine parsers.
 *
 * @see https://github.com/markuplint/markuplint/issues/240
 * @see https://markuplint.dev/docs/guides/besides-html
 */
class NunjucksParser extends HtmlParser {
	constructor() {
		super({
			// Patterns are masked in declaration order, so if a future pattern
			// shares a common prefix with another, the more specific pattern
			// must be listed first.
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

/**
 * Singleton Nunjucks parser instance for use by the markuplint engine.
 */
export const parser = new NunjucksParser();
