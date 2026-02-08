import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for Nunjucks templates that extends the standard HTML parser.
 *
 * Configures the HTML parser to recognize Nunjucks tag variants as opaque blocks:
 * - `{% ... %}` (block tags such as if, for, macro)
 * - `{{ ... }}` (output / variable interpolation)
 * - `{# ... #}` (comments)
 */
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

/**
 * Singleton Nunjucks parser instance for use by the markuplint engine.
 */
export const parser = new NunjucksParser();
