import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for EJS (Embedded JavaScript) templates that extends the standard HTML parser.
 *
 * Configures the HTML parser to recognize all EJS tag variants as opaque blocks:
 * - `<%_ ... %>` (whitespace-slurping scriptlets)
 * - `<%= ... %>` (escaped output)
 * - `<%- ... %>` (unescaped output)
 * - `<%# ... %>` (comments)
 * - `<% ... %>` (plain scriptlets)
 *
 * Known limitation: EJS expressions inside unquoted attribute values
 * (e.g. `<div attr=<%= value %>>`) are not supported; quoted attribute
 * values work. This limitation is shared by all template engine parsers.
 *
 * @see https://github.com/markuplint/markuplint/issues/240
 * @see https://markuplint.dev/docs/guides/besides-html
 */
class EJSParser extends HtmlParser {
	constructor() {
		super({
			// Patterns are matched in order, so the entries are ordered from
			// most specific to least specific; the catch-all `ejs-scriptlet`
			// pattern must remain last, otherwise it would match the more
			// specific tag variants first.
			ignoreTags: [
				{
					type: 'ejs-whitespace-slurping',
					start: '<%_',
					end: '%>',
				},
				{
					type: 'ejs-output-value',
					start: '<%=',
					end: '%>',
				},
				{
					type: 'ejs-output-unescaped',
					start: '<%-',
					end: '%>',
				},
				{
					type: 'ejs-comment',
					start: '<%#',
					end: '%>',
				},
				{
					type: 'ejs-scriptlet',
					// The negative lookahead `(?!%)` excludes `<%%`, EJS's literal
					// escape sequence, which must remain a literal text node.
					start: /<%(?!%)/,
					end: '%>',
				},
			],
		});
	}
}

/**
 * Singleton EJS parser instance for use by the markuplint engine.
 */
export const parser = new EJSParser();
