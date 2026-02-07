/**
 * @module @markuplint/liquid-parser
 * Markuplint parser plugin for Liquid templates. Extends the standard HTML parser
 * to treat Liquid block tags and output expressions as opaque blocks, allowing
 * markuplint to lint the surrounding HTML structure.
 */

export { parser } from './parser.js';
