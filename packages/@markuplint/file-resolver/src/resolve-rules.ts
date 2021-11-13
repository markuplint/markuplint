import type { AnyMLRule, Ruleset, Plugin } from '@markuplint/ml-core';

import { autoLoadRules } from './auto-load-rules';

let cachedPresetRules: AnyMLRule[] | null = null;

export async function resolveRules(
	plugins: Plugin[],
	ruleset: Ruleset,
	importPreset: boolean,
	/**
	 * @deprecated
	 */
	autoLoad: boolean,
) {
	const rules = importPreset ? await importPresetRules() : [];
	plugins.forEach(plugin => {
		if (!plugin.rules) {
			return;
		}
		Object.entries(plugin.rules).forEach(([, rule]) => {
			rules.push(rule);
		});
	});
	if (autoLoad) {
		const { rules: additionalRules } = await autoLoadRules(ruleset);
		additionalRules.forEach(rule => {
			rules.push(rule);
		});
	}
	// Clone
	return rules.slice();
}

async function importPresetRules() {
	if (cachedPresetRules) {
		return cachedPresetRules;
	}
	const modName = '@markuplint/rules';
	const presetRules: AnyMLRule[] = (await import(modName)).default;
	cachedPresetRules = presetRules;
	// Clone
	return presetRules.slice();
}
