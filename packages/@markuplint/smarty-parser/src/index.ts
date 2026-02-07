/**
 * @module @markuplint/smarty-parser
 * Markuplint parser plugin for Smarty templates. Extends the standard HTML parser
 * to treat Smarty literal blocks, comments, and scriptlet tags as opaque blocks,
 * allowing markuplint to lint the surrounding HTML structure.
 */

export { parser } from './parser.js';
