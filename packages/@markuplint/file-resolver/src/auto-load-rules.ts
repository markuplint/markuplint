import type { Ruleset, AnyMLRule, AnyRuleSeed } from '@markuplint/ml-core';

import { MLRule } from '@markuplint/ml-core';

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

		let seed: AnyRuleSeed | null = null;

		try {
			const _module = await import(`@markuplint/rule-${ruleName}`);
			seed = _module.default;
			if (!(seed && 'defaultValue' in seed && 'defaultOptions' in seed && 'verify' in seed)) {
				seed = null;
			}
		} catch (error) {
			errors.push(error);
		}

		if (seed) {
			const rule = new MLRule({
				name: ruleName,
				...seed,
			});

			cache.set(ruleName, rule);
			rules.push(rule);
			continue;
		}

		try {
			const _module = await import(`markuplint-rule-${ruleName}`);
			seed = _module.default;
			if (!(seed && 'defaultValue' in seed && 'defaultOptions' in seed && 'verify' in seed)) {
				seed = null;
			}
		} catch (error) {
			errors.push(error);
		}

		if (seed) {
			const rule = new MLRule({
				name: ruleName,
				...seed,
			});

			cache.set(ruleName, rule);
			rules.push(rule);
			continue;
		}
	}

	return {
		// Clone
		rules: rules.slice(),
		// Clone
		errors: errors.slice(),
	};
}
