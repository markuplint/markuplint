/**
 * @module api
 *
 * Public API entry point for markuplint.
 * Re-exports the lint engine and the standalone lint function used for programmatic access.
 */

/** The primary linting engine that manages file resolution, configuration, and rule execution. */
export { MLEngine, FromCodeOptions } from './ml-engine.js';

/** Standalone function to lint one or more files or source code strings. */
export { lint } from './lint.js';
