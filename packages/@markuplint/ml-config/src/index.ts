/**
 * Configuration types and the merge algorithm for markuplint.
 *
 * Design decision: markuplint keeps a JSON-based `extends` merge model;
 * an ESLint-style Flat Config was evaluated and rejected. Flat Config
 * assumes JavaScript configuration files, whereas markuplint's primary
 * audience is HTML/markup developers who benefit from JSON schema
 * validation and language-agnostic editing. The `nodeRules`/`childNodeRules`
 * CSS-selector targeting has no equivalent in Flat Config's file-pattern
 * model. ESLint itself re-added `extends` to Flat Config in March 2025,
 * and its v9 migration caused significant community pain — improving the
 * JSON-based `extends` merge strategy is the optimal approach for markuplint.
 *
 * @module
 */
export * from './merge-config.js';
export * from './pretender-file-path.js';
export * from './rule-aliases.js';
export * from './utils.js';
export type * from './types.js';
