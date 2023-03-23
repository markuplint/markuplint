import type { RuleSeed } from './types';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { MLRule } from './ml-rule';

export function createRule<T extends RuleConfigValue, O extends PlainData = undefined>(
	seed: RuleSeed<T, O> & {
		name: string;
	},
) {
	return new MLRule<T, O>(seed);
}
