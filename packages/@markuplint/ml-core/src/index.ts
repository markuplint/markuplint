import { RuleConfig, RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config';

import MLRule from './ml-rule';
import { Options, RuleInfo, Severity, VerifiedResult } from './ml-rule/types';

export function createRule<T extends RuleConfigValue, O extends RuleConfigOptions>(options: Options<T, O>) {
	return MLRule.create(options);
}
