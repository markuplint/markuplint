import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for Smarty templates that extends the standard HTML parser.
 *
 * Configures the HTML parser to recognize Smarty tag variants as opaque blocks:
 * - `{literal} ... {/literal}` (literal blocks passed through without parsing)
 * - `{* ... *}` (Smarty comments)
 * - `{ ... }` (general Smarty scriptlet tags for variables, functions, and modifiers)
 *
 * Known limitation: template expressions inside unquoted attribute values
 * (e.g. `<div attr={ $value }>`) are not supported; quoted attribute
 * values work. This limitation is shared by all template engine parsers.
 *
 * @see https://github.com/markuplint/markuplint/issues/240
 * @see https://markuplint.dev/docs/guides/besides-html
 */
class SmartyParser extends HtmlParser {
	constructor() {
		super({
			// Patterns are matched in order, so the entries are ordered from
			// most specific to least specific; `{literal}` and `{*` must come
			// before the catch-all `{` pattern, otherwise the generic
			// `smarty-scriptlet` pattern would match them first.
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
