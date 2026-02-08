/**
 * @module
 * Astro component parser for markuplint. Provides a parser that transforms Astro
 * component syntax into markuplint's AST, handling frontmatter blocks, expression
 * syntax (`{}`), Astro-specific directives (e.g., `class:list`, `set:html`),
 * and namespace-aware element resolution.
 */

export { parser } from './parser.js';
