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
export { multiPassFix } from './multi-pass-fix.js';
export type { MultiPassFixHost } from './multi-pass-fix.js';
export { createConfigViolationsOf } from './config-violations.js';
// The Rust path of `markuplint` asks it for what the TS selector parser says of a selector the Rust one rejected.
export { createSelector } from '@markuplint/selector';
export * from './convert-ruleset.js';
export * from './ml-core.js';
export * from './ml-dom/index.js';
export { getBooleanAttrNames, literalToExpression } from './ml-dom/helper/literal-values.js';
export * from './ml-rule/index.js';
export * from './test/index.js';
export type * from './types.js';
export * from './utils/index.js';
export * from './violation-collector.js';
export * from './virtual-rule.js';

export type { AccessibilityProperties, PretenderSlotContent } from './ml-dom/node/types.js';
