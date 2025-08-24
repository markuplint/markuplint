export { getAttrSpecs as getAttrSpecsByNames } from './utils/get-attr-specs-spec.js';
export * from './utils/aria-version.js';

// ARIA algorithms
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

// Type definitions
export * from './types/index.js';
export * from './types/aria.js';
export * from './types/attributes.js';
export * from './types/permitted-structures.js';
