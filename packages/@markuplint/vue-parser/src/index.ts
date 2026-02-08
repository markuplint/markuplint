/**
 * @module
 * Vue Single File Component (SFC) template parser for markuplint. Provides a parser
 * that transforms Vue template syntax into markuplint's AST using the vue-eslint-parser,
 * handling Vue-specific directives such as `v-bind`, `v-on`, `v-model`, and `v-slot`.
 */

export { parser } from './parser.js';
