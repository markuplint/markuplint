import type { RuleSeed } from './types';
import type { RuleConfigValue } from '@markuplint/ml-config';

import { MLRule } from './ml-rule';

export function createRule<T extends RuleConfigValue, O = null>(
	seed: RuleSeed<T, O> & {
		name: string;
	},
) {
	return new MLRule<T, O>(seed);
}
