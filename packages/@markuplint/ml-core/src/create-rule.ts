import { RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config';
import { MLRule, MLRuleOptions } from './ml-rule';

export function createRule<T extends RuleConfigValue, O extends RuleConfigOptions>(options: MLRuleOptions<T, O>) {
	return MLRule.create(options);
}
