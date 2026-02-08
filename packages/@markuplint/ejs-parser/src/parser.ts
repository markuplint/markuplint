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
 */
class EJSParser extends HtmlParser {
	constructor() {
		super({
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
