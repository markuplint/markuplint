import deepAssign from 'deep-assign';

import extendsRuleResolver from './extendsRuleResolver';

import Ruleset from './';

/**
 * Recursive loading extends rules
 *
 * @param extendRules value of `extends` property
 * @param ruleset Ruleset instance
 */
export default async function extendsRules (extendRules: string | string[], baseRuleFilePath: string, ruleset: Ruleset) {
	const extendRuleList = Array.isArray(extendRules) ? extendRules : [extendRules];
	for (const extendRule of extendRuleList) {
		if (!extendRule || !extendRule.trim()) {
			continue;
		}
		const { ruleConfig, ruleFilePath } = await extendsRuleResolver(extendRule, baseRuleFilePath);
		if (!ruleConfig) {
			return;
		}
		if (ruleConfig.rules) {
			ruleset.rules = deepAssign(ruleset.rules, ruleConfig.rules);
		}
		if (ruleConfig.nodeRules) {
			ruleset.nodeRules = deepAssign(ruleset.nodeRules, ruleConfig.nodeRules);
		}
		if (ruleConfig.extends) {
			await extendsRules(ruleConfig.extends, ruleFilePath, ruleset);
		}
	}
}
