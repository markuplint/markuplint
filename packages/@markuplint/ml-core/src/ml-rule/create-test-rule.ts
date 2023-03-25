import type { RuleSeed } from './types';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { MLRule } from './ml-rule';

export function createRule<T extends RuleConfigValue, O extends PlainData = undefined>(
	seed: Readonly<RuleSeed<T, O>> & {
		readonly name: string;
	},
) {
	return new MLRule<T, O>(seed);
}
