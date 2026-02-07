/**
 * @module @markuplint/mustache-parser
 * Markuplint parser plugin for Mustache and Handlebars templates. Extends the standard
 * HTML parser to treat Mustache/Handlebars tags, unescaped expressions, and comments
 * as opaque blocks, allowing markuplint to lint the surrounding HTML structure.
 */

export { parser } from './parser.js';
