import type { Ruleset, AnyMLRule, AnyRuleSeed } from '@markuplint/ml-core';

import { MLRule } from '@markuplint/ml-core';

/**
 * `null` records a miss. Built-in rule names never resolve to a package and this runs once per linted
 * file, so without it every file repeats two failing imports per rule.
 */
const cache = new Map<string, AnyMLRule | null>();

export function cacheClear() {
	cache.clear();
}

export async function autoLoadRules(ruleset: Ruleset) {
	const rules: AnyMLRule[] = [];
	const errors: unknown[] = [];

	for (const ruleName of Object.keys(ruleset.rules)) {
		const cached = cache.get(ruleName);
		if (cached) {
			rules.push(cached);
			continue;
		}
		if (cache.has(ruleName)) {
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

		cache.set(ruleName, null);
	}

	return {
		// Clone
		rules: [...rules],
		// Clone
		errors: [...errors],
	};
}
