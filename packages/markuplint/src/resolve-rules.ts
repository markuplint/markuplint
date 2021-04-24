import { MLRule } from '@markuplint/ml-core';
import { RuleConfigValue } from '@markuplint/ml-config';

export async function resolveRules(options: { rules?: MLRule<RuleConfigValue, unknown>[] }) {
	let rules: MLRule<RuleConfigValue, unknown>[];
	if (options.rules) {
		rules = options.rules;
	} else {
		const r = await import('@markuplint/rules');
		rules = r.default;
	}

	return rules;
}

export function resolveRulesSync(options: { rules?: MLRule<RuleConfigValue, unknown>[] }) {
	let rules: MLRule<RuleConfigValue, unknown>[];
	if (options.rules) {
		rules = options.rules;
	} else {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const r = require('@markuplint/rules');
		rules = r.default;
	}

	return rules;
}
