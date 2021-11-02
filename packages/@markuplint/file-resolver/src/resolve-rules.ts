import type { AnyMLRule } from '@markuplint/ml-core';

const cache = new Map<string, AnyMLRule[]>();

export async function resolveRules(importRuleSet?: string[], importPreset = true) {
	const rules = importPreset ? await importPresetRules() : [];
	if (importRuleSet) {
		for (const ruleFilePath of importRuleSet) {
			const rules = await importRules(ruleFilePath);
			rules.push(...rules);
		}
	}
	// Clone
	return rules.slice();
}

async function importRules(filePath: string) {
	const cached = cache.get(filePath);
	if (cached) {
		// Clone
		return cached.slice();
	}
	const r = await import(filePath);
	const rules: AnyMLRule[] = Array.from(r.default) ? r.default : [r.default];
	cache.set(filePath, rules);
	// Clone
	return rules.slice();
}

async function importPresetRules() {
	const modName = '@markuplint/rules';
	const cached = cache.get(modName);
	if (cached) {
		// Clone
		return cached.slice();
	}
	const r = await import(modName);
	const rules: AnyMLRule[] = r.default;
	cache.set(modName, rules);
	// Clone
	return rules.slice();
}
