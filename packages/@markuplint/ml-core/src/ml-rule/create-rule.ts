import type { RuleSeed } from './types';
import type { RuleConfigValue } from '@markuplint/ml-config';

export function createRule<T extends RuleConfigValue, O = null>(seed: RuleSeed<T, O>) {
	return seed;
}
