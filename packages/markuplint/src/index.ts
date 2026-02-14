/**
 * @module markuplint
 *
 * Main package entry point for markuplint.
 * Re-exports the public API surface including the lint engine, types,
 * internationalization utilities, testing tools, and version information.
 */

/** The primary linting engine and options for linting from source code strings. */
export { MLEngine, FromCodeOptions } from './api/index.js';

/** Event map type describing events emitted by {@link MLEngine}. */
export { MLEngineEventMap } from './api/types.js';

/** Internationalization utilities for loading locale-specific message sets. */
export * from './i18n.js';

/** Testing utilities for verifying markuplint rules and configurations. */
export * from './testing-tool/index.js';

/** Shared type definitions for lint results and violations. */
export * from './types.js';

/** The current markuplint package version string. */
export { version } from './version.js';
