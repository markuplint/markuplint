/**
 * @module
 * Pug template parser for markuplint. Provides a parser that transforms Pug (formerly Jade)
 * template syntax into markuplint's AST, handling indentation-based nesting, tag interpolation,
 * inline HTML, Pug attributes, mixins, conditionals, and other Pug-specific constructs.
 */

export { parser } from './parser.js';
