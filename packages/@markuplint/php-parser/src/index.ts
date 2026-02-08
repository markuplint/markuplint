/**
 * @module @markuplint/php-parser
 * Markuplint parser plugin for PHP templates. Extends the standard HTML parser
 * to treat PHP code blocks and short echo tags as opaque blocks, allowing
 * markuplint to lint the surrounding HTML structure.
 */

export { parser } from './parser.js';
