import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for Smarty templates that extends the standard HTML parser.
 *
 * Configures the HTML parser to recognize Smarty tag variants as opaque blocks:
 * - `{literal} ... {/literal}` (literal blocks passed through without parsing)
 * - `{* ... *}` (Smarty comments)
 * - `{ ... }` (general Smarty scriptlet tags for variables, functions, and modifiers)
 */
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

/**
 * Singleton Smarty parser instance for use by the markuplint engine.
 */
export const parser = new SmartyParser();
