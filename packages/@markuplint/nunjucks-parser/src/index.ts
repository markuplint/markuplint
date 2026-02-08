/**
 * @module @markuplint/nunjucks-parser
 * Markuplint parser plugin for Nunjucks templates. Extends the standard HTML parser
 * to treat Nunjucks block tags, output expressions, and comments as opaque blocks,
 * allowing markuplint to lint the surrounding HTML structure.
 */

export { parser } from './parser.js';
