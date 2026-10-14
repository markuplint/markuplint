import type { Ruleset, AnyMLRule, AnyRuleSeed } from '@markuplint/ml-core';

import { MLRule } from '@markuplint/ml-core';

type Loaded = {
	readonly rule: AnyMLRule | null;
	readonly errors: readonly unknown[];
};

/**
 * Keyed by rule name, holding the in-flight or settled load. A miss stays
 * cached (`rule: null`, with the errors each probe raised) until
 * {@link clearAutoLoadRulesCache}: this runs once per linted file and built-in
 * rule names never resolve to a package, so re-probing would cost two failing
 * imports per rule per file. Same lifetime policy as `generalImport`'s cache,
 * which never retries a miss either.
 *
 * The entry is set synchronously before the first `await`, so a
 * `clearAutoLoadRulesCache()` that lands mid-load evicts the promise and the
 * eventual result is never written back into the fresh map.
 */
const cache = new Map<string, Promise<Loaded>>();

export function clearAutoLoadRulesCache() {
	cache.clear();
}

export async function autoLoadRules(ruleset: Ruleset) {
	const rules: AnyMLRule[] = [];
	const errors: unknown[] = [];

	for (const ruleName of Object.keys(ruleset.rules)) {
		let loading = cache.get(ruleName);
		if (!loading) {
			loading = load(ruleName);
			cache.set(ruleName, loading);
		}
		const loaded = await loading;
		if (loaded.rule) {
			rules.push(loaded.rule);
		}
		errors.push(...loaded.errors);
	}

	return { rules, errors };
}

async function load(ruleName: string): Promise<Loaded> {
	const errors: unknown[] = [];

	for (const specifier of [`@markuplint/rule-${ruleName}`, `markuplint-rule-${ruleName}`]) {
		try {
			const mod = await import(specifier);
			const seed: unknown = mod.default;
			if (isRuleSeed(seed)) {
				return { rule: new MLRule({ name: ruleName, ...seed }), errors };
			}
		} catch (error) {
			errors.push(error);
		}
	}

	return { rule: null, errors };
}

function isRuleSeed(seed: unknown): seed is AnyRuleSeed {
	return !!seed && typeof seed === 'object' && 'defaultValue' in seed && 'defaultOptions' in seed && 'verify' in seed;
}
