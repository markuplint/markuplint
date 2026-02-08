import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for Liquid templates that extends the standard HTML parser.
 *
 * Configures the HTML parser to recognize Liquid tag variants as opaque blocks:
 * - `{% ... %}` (block tags such as if, for, assign)
 * - `{{ ... }}` (output / variable interpolation)
 */
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

/**
 * Singleton Liquid parser instance for use by the markuplint engine.
 */
export const parser = new LiquidParser();
