/**
 * @module @markuplint/erb-parser
 * Markuplint parser plugin for ERB (Embedded Ruby) templates. Extends the standard
 * HTML parser to treat ERB tags as opaque blocks, allowing markuplint to lint
 * the surrounding HTML structure.
 */

export { parser } from './parser.js';
