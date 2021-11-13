import type { Ruleset, AnyMLRule } from '@markuplint/ml-core';

const cache = new Map<string, AnyMLRule>();

/**
 * @deprecated
 */
export async function autoLoadRules(ruleset: Ruleset) {
	const rules: AnyMLRule[] = [];
	const errors: unknown[] = [];

	for (const ruleName of Object.keys(ruleset.rules)) {
		const cached = cache.get(ruleName);
		if (cached) {
			rules.push(cached);
			continue;
		}

		let rule: AnyMLRule | null = null;

		try {
			const _module = await import(`@markuplint/rule-${ruleName}`);
			rule = _module.default;
		} catch (e) {
			errors.push(e);
		}

		if (rule) {
			rules.push(rule);
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

		cache.set(ruleName, rule);
		rules.push(rule);
	}

	return {
		// Clone
		rules: rules.slice(),
		// Clone
		errors: errors.slice(),
	};
}
