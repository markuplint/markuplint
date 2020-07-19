import { MLRule } from '@markuplint/ml-core';
import { RuleConfigValue } from '@markuplint/ml-config';

export async function resolveRules(options: { rules?: MLRule<RuleConfigValue, unknown>[]; default?: string }) {
	let rules: MLRule<RuleConfigValue, unknown>[];
	if (options.rules) {
		rules = options.rules;
	} else {
		const defaults = options.default || '@markuplint/rules';
		const r = await import(defaults);
		rules = r.default;
	}

	return rules;
}
