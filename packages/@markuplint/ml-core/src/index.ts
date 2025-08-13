export { RuleInfo, RuleConfig, RuleConfigValue } from '@markuplint/ml-config';
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
export { getIndent } from './ml-dom/helper/get-indent.js';
export * from './convert-ruleset.js';
export * from './ml-core.js';
export * from './ml-dom/index.js';
export * from './ml-rule/index.js';
export * from './plugin/index.js';
export * from './test/index.js';
export * from './types.js';
export * from './utils/index.js';
export * from './violation-collector.js';

export { AccessibilityProperties } from './ml-dom/node/types.js';
