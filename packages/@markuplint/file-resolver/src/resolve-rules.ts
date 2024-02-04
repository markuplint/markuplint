import type { AnyMLRule, Ruleset, Plugin, AnyRuleSeed } from '@markuplint/ml-core';

import { MLRule } from '@markuplint/ml-core';

import { autoLoadRules } from './auto-load-rules.js';

let cachedPresetRules: Readonly<AnyMLRule>[] | null = null;

export async function resolveRules(
	plugins: readonly Plugin[],
	ruleset: Ruleset,
	importPreset: boolean,
	/**
	 * @deprecated
	 */
	autoLoad: boolean,
) {
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
	if (autoLoad) {
		const { rules: additionalRules } = await autoLoadRules(ruleset);
		for (const rule of additionalRules) {
			rules.push(rule);
		}
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
