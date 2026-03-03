/**
 * @module @markuplint/pretenders
 *
 * Provides scanning utilities for detecting component-to-element mappings (pretenders)
 * in source files. Pretenders allow markuplint to understand which native HTML
 * elements a component renders, enabling accurate linting of component-based code.
 *
 * ## Scanning
 *
 * - {@link scan} — Unified entry point that dispatches to the appropriate scanner by file extension
 * - {@link jsxScanner} — Scans JSX/TSX files using the TypeScript compiler API
 * - {@link templateScanner} — Scans Vue, Svelte, and Astro SFC files using markuplint's parsers
 *
 * ## Import resolution
 *
 * - {@link analyzeImports} — Extracts import bindings from component script blocks
 *   (Vue `<script setup>`, Vue Options API, Svelte, Astro, MDX)
 * - {@link resolveComponentImport} — Resolves a component name to its import binding,
 *   including Vue kebab-case → PascalCase normalization
 * - {@link resolveBarrelExport} — Resolves barrel file (`index.ts`/`index.js`) re-exports
 *   to original source modules. Call this separately after `analyzeImports` when an import
 *   source points to a directory with a barrel index.
 *
 * Dynamic imports (`import('./path')`) are included in bindings with `type: 'dynamic'`
 * and `localName: '*'` as a sentinel. Check `type === 'dynamic'` to distinguish from
 * namespace imports.
 */

export { jsxScanner } from './jsx/index.js';
export { templateScanner } from './template/index.js';
export { scan } from './scan.js';
export type { ScanOptions } from './scan.js';
export { analyzeImports, resolveComponentImport, resolveBarrelExport } from './import-resolver/index.js';
export type { ImportBinding, ImportAnalysisResult } from './import-resolver/types.js';
export type * from './types.js';
