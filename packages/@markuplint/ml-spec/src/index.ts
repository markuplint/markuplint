/**
 * Specification foundation layer for markuplint.
 *
 * Type definitions, W3C specification algorithms (WAI-ARIA, HTML-AAM, AccName,
 * HTML content models), and JSON schemas live together in this single package
 * by design. Separating the "static schemas" from the "computing algorithms"
 * was considered and rejected: the algorithms are integral parts of the
 * specifications themselves — HTML elements define implicit ARIA roles, the
 * ARIA algorithms reference HTML semantics, and test cases validate
 * cross-specification behavior — so a split would create an artificial
 * boundary with no runtime benefit.
 *
 * The accessible name computation (`getAccname`) is implemented in-house with
 * no external dependency; this is intentional.
 *
 * Versioning policy: the schemas and spec data structures are not part of
 * markuplint's public API surface. Changes to schemas, generated types, or
 * algorithm behavior are released as minor versions.
 *
 * Several module-level caches (element spec lookup, namespace resolution,
 * version-resolved ARIA, content-model category tables) are intentionally
 * never invalidated: spec data is immutable after merging and a lint run uses
 * a single configuration. Long-running embedders (e.g. language servers)
 * should be aware that spec data is cached at first access for the process
 * lifetime.
 *
 * @module @markuplint/ml-spec
 */

export { getAttrSpecs as getAttrSpecsByNames } from './utils/get-attr-specs-spec.js';
export * from './utils/aria-version.js';

// Constants
export { EMBEDDED_CONTROL_ROLES, isNativeEmbeddedControl } from './const/index.js';

// ARIA algorithms
export * from './algorithm/aria/accname/index.js';
export * from './algorithm/aria/accname-computation.js';
export * from './algorithm/aria/get-computed-aria-props.js';
export * from './algorithm/aria/get-computed-role.js';
export * from './algorithm/aria/get-implicit-role.js';
export * from './algorithm/aria/get-permitted-roles.js';
export * from './algorithm/aria/has-required-owned-elements.js';
export * from './algorithm/aria/is-exposed.js';
export * from './algorithm/aria/aria-specs.js';
export * from './algorithm/aria/get-aria.js';
export * from './algorithm/aria/get-role-spec.js';
export * from './algorithm/aria/is-presentational.js';

// HTML algorithms
export * from './algorithm/html/get-content-model.js';
export * from './algorithm/html/may-be-focusable.js';
export * from './algorithm/html/content-model-category-to-tag-names.js';
export * from './algorithm/html/get-selectors-by-content-model-category.js';
export * from './algorithm/html/is-nothing-content-model.js';
export * from './algorithm/html/is-palpable-elements.js';
export * from './algorithm/html/is-void-element.js';

// Shared utilities
export * from './utils/get-attr-specs.js';
export * from './utils/get-spec.js';
export * from './utils/get-spec-by-tag-name.js';
export * from './utils/schema-to-spec.js';
export * from './utils/resolve-namespace.js';
export * from './utils/validate-aria-version.js';
export * from './utils/directive-resolver.js';
export * from './utils/is-conditional-attribute-type.js';

// Type definitions
export * from './types/index.js';
export * from './types/aria.js';
export * from './types/attributes.js';
export * from './types/permitted-structures.js';
