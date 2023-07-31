import type { RuleSeed } from './types.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

export function createRule<T extends RuleConfigValue, O extends PlainData = undefined>(seed: Readonly<RuleSeed<T, O>>) {
	return seed;
}
