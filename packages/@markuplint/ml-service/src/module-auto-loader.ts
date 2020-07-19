import { MLRule, Ruleset } from '@markuplint/ml-core';
import { RuleConfigValue } from '@markuplint/ml-config';

export async function moduleAutoLoader<T extends RuleConfigValue, O = unknown>(ruleset: Ruleset) {
	const rules: MLRule<T, O>[] = [];
	const errors: unknown[] = [];

	for (const ruleName of Object.keys(ruleset.rules)) {
		let rule: MLRule<T, O> | null = null;

		try {
			const _module = await import(`@markuplint/rule-${ruleName}`);
			rule = _module.default;
		} catch (e) {
			errors.push(e);
		}

		if (!rule) {
			continue;
		}

		try {
			const _module = await import(`markuplint-rule-${ruleName}`);
			rule = _module.default;
		} catch (e) {
			errors.push(e);
		}

		if (!rule) {
			continue;
		}

		rules.push(rule);
	}

	return {
		rules,
		errors,
	};
}
