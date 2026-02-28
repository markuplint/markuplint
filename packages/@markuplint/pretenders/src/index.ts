/**
 * @module @markuplint/pretenders
 *
 * Provides scanning utilities for detecting component-to-element mappings (pretenders)
 * in source files. Pretenders allow markuplint to understand which native HTML
 * elements a component renders, enabling accurate linting of component-based code.
 *
 * - {@link jsxScanner} — Scans JSX/TSX files using the TypeScript compiler API
 * - {@link templateScanner} — Scans Vue, Svelte, and Astro SFC files using markuplint's parsers
 * - {@link analyzeImports} — Extracts import bindings from component script blocks
 * - {@link resolveComponentImport} — Resolves component template usage to import source paths
 */

export { jsxScanner } from './jsx/index.js';
export { templateScanner } from './template/index.js';
export { analyzeImports, resolveComponentImport } from './import-resolver/index.js';
export type { ImportBinding, ImportAnalysisResult } from './import-resolver/types.js';
export type * from './types.js';
