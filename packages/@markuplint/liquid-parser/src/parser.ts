import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for Liquid templates that extends the standard HTML parser.
 *
 * Configures the HTML parser to recognize Liquid tag variants as opaque blocks:
 * - `{% ... %}` (block tags such as if, for, assign)
 * - `{{ ... }}` (output / variable interpolation)
 *
 * Known limitation: template expressions inside unquoted attribute values
 * are not supported. This limitation is shared by all template engine parsers.
 *
 * @see https://github.com/markuplint/markuplint/issues/240
 * @see https://markuplint.dev/docs/guides/besides-html
 */
class LiquidParser extends HtmlParser {
	constructor() {
		super({
			// The `type` value becomes the `#ps:<type>` node name in the AST;
			// renaming a type is a breaking change for downstream consumers
			// that match on these node names.
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
