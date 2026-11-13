import type { AnyMLRule, AnyRuleSeed } from '@markuplint/ml-core';

import { MLRule } from '@markuplint/ml-core';

let cachedRules: Readonly<AnyMLRule>[] | null = null;

/**
 * Resolves the built-in rules of `@markuplint/rules` into a flat array of {@link MLRule} instances.
 * They are the only rules there are: a rule comes from no other place.
 *
 * @returns A new array of the built-in rules
 */
export async function resolveRules() {
	if (cachedRules) {
		return [...cachedRules];
	}
	const modName = '@markuplint/rules';
	const mod = await import(modName);
	const presetRules: Record<string, AnyRuleSeed> = mod.default;
	cachedRules = Object.entries(presetRules).map(
		([name, seed]) =>
			new MLRule({
				name,
				...seed,
			}),
	);
	// Clone
	return [...cachedRules];
}
