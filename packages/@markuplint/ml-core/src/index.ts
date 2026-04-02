export type { RuleInfo, RuleConfig, RuleConfigValue } from '@markuplint/ml-config';
export {
	ariaSpecs,
	contentModelCategoryToTagNames,
	getAttrSpecs,
	getComputedRole,
	getImplicitRole,
	getPermittedRoles,
	getRoleSpec,
	getSpec,
	resolveNamespace,
} from '@markuplint/ml-spec';
export { Ruleset } from './ruleset/index.js';
export { enableDebug } from './debug.js';
export { computeCursorOffset } from './cursor-offset.js';
export { applyFixes } from './fix-applier.js';
export type { FixResult } from './fix-applier.js';
export * from './convert-ruleset.js';
export * from './ml-core.js';
export * from './ml-dom/index.js';
export * from './ml-rule/index.js';
export * from './plugin/index.js';
export * from './test/index.js';
export type * from './types.js';
export * from './utils/index.js';
export * from './violation-collector.js';
export * from './virtual-rule.js';

export type { AccessibilityProperties } from './ml-dom/node/types.js';
