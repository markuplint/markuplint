/**
 * @module @markuplint/htmx-parser
 * Markuplint parser plugin for htmx-enhanced HTML. Extends the standard HTML parser
 * to recognize htmx-specific attributes (e.g., hx-get, hx-on) and map event handler
 * shorthand syntax to their canonical forms for accurate linting.
 */

export { parser } from './parser.js';
