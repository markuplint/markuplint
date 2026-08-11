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
 *
 * ## Lint-time disambiguation
 *
 * - {@link disambiguatePretenders} — Given a flat pretender list and the file currently
 *   being linted, resolves which of several same-selector candidates that file actually
 *   refers to (via its own declarations or imports), so linting doesn't fall back to
 *   whichever same-named component happened to be scanned first (see issue #3951).
 *
 * ## On-demand resolution
 *
 * - {@link autoScan} — Resolves pretenders for a single lint target by walking its own
 *   import graph (breadth-first, extension-agnostic) instead of requiring pre-configured
 *   `files`/`scan` glob patterns. Backs the `pretenders: { auto: true }` config option.
 *
 * ## Caching
 *
 * - {@link clearPretenderCaches} — Clears the module-level caches that back import/export
 *   resolution (module resolution, export tables, parsed JSX `SourceFile`s, auto-scan
 *   results). None of these caches expire on their own, so a long-running host (watch mode,
 *   an editor extension) that re-resolves pretenders across file edits must call this after
 *   each edit, or renamed exports, newly valid tsconfig `paths` aliases, and stale parsed/
 *   scanned files keep resolving as they did before the change for the rest of the process.
 */

import { clearAutoScanCache } from './auto-scan.js';
import { clearExportTableCache } from './dependency-mapper.js';
import { clearModuleResolutionCaches } from './import-resolver/resolve-module-file.js';
import { clearSourceFileCache } from './jsx/compiler-host.js';

export { autoScan } from './auto-scan.js';
export type { DisambiguateOptions } from './disambiguate.js';
export { disambiguatePretenders } from './disambiguate.js';
export { jsxScanner } from './jsx/index.js';
export { templateScanner } from './template/index.js';
export { scan } from './scan.js';
export type { ScanOptions } from './scan.js';
export { analyzeImports, resolveComponentImport, resolveBarrelExport } from './import-resolver/index.js';
export type { ImportBinding, ImportAnalysisResult } from './import-resolver/types.js';
export type * from './types.js';

/**
 * Clears the module-level caches that back import/export resolution (see the
 * module-level "Caching" section above for why a long-running host must call this).
 */
export function clearPretenderCaches() {
	clearExportTableCache();
	clearModuleResolutionCaches();
	clearSourceFileCache();
	clearAutoScanCache();
}

// Companion Module pattern types
export type {
	ComponentScanner,
	ComponentScanResult,
	ComponentScanAttr,
	ComponentScanScriptSource,
} from './component-scanner.js';
