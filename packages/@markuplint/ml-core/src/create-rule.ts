import type { MLRuleOptions } from './ml-rule';
import type { RuleConfigValue } from '@markuplint/ml-config';

import { MLRule } from './ml-rule';

export function createRule<T extends RuleConfigValue, O = null>(options: MLRuleOptions<T, O>) {
	return new MLRule(options);
}
