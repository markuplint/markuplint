import { MLRule, MLRuleOptions } from './ml-rule';
import { RuleConfigValue } from '@markuplint/ml-config';

export function createRule<T extends RuleConfigValue, O = null>(options: MLRuleOptions<T, O>) {
	return MLRule.create(options);
}
