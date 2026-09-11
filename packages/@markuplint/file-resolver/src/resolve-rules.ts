import type { AnyMLRule, Ruleset, Plugin, AnyRuleSeed } from '@markuplint/ml-core';

import { MLRule } from '@markuplint/ml-core';

import { autoLoadRules } from './auto-load-rules.js';

let cachedPresetRules: Readonly<AnyMLRule>[] | null = null;

/**
 * Resolves all rules from preset rules, plugins, and auto-loaded rules into
 * a flat array of {@link MLRule} instances.
 *
 * @param plugins - The resolved plugins that may provide custom rules
 * @param ruleset - The current ruleset (used for auto-loading)
 * @param importPreset - Whether to import the built-in preset rules from `@markuplint/rules`
 * @returns An array of all resolved MLRule instances
 */
export async function resolveRules(plugins: readonly Plugin[], ruleset: Ruleset, importPreset: boolean) {
	const rules = importPreset ? await importPresetRules() : [];
	for (const plugin of plugins) {
		if (!plugin.rules) {
			continue;
		}
		for (const [name, seed] of Object.entries(plugin.rules)) {
			const rule = new MLRule({
				name: `${plugin.name}/${name}`,
				...seed,
			});
			rules.push(rule);
		}
	}
	const { rules: additionalRules } = await autoLoadRules(ruleset);
	for (const rule of additionalRules) {
		rules.push(rule);
	}
	// Clone
	return [...rules];
}

async function importPresetRules() {
	if (cachedPresetRules) {
		return [...cachedPresetRules];
	}
	const modName = '@markuplint/rules';
	const mod = await import(modName);
	const presetRules: Record<string, AnyRuleSeed> = mod.default;
	const ruleList = Object.entries(presetRules).map(([name, seed]) => {
		const rule = new MLRule({
			name,
			...seed,
		});
		return rule;
	});
	cachedPresetRules = ruleList;
	// Clone
	return [...ruleList];
}
