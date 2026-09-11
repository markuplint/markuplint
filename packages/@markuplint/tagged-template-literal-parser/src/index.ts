/**
 * @module @markuplint/tagged-template-literal-parser
 * Tagged template literal parser for markuplint. Extracts HTML from tagged
 * template literals (e.g., `html\`<div>...</div>\``) in TypeScript/JavaScript
 * files and parses the HTML content for linting.
 */

export { TaggedTemplateLiteralParser, parser } from './parser.js';
