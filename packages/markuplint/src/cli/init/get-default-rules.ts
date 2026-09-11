import type { DefaultRules } from './types.js';
import type { Writable } from 'type-fest';

import builtinRules from '@markuplint/rules';

export function getDefaultRules() {
	const rules: Writable<DefaultRules> = {};

	for (const [ruleName, rule] of Object.entries(builtinRules)) {
		const defaultSeverity = rule.defaultSeverity;
		const defaultValue = defaultSeverity === 'warning' ? false : (rule.defaultValue ?? true);
		const category = rule.meta?.category;
		if (category) {
			rules[ruleName] = {
				defaultValue,
				category,
			};
		}
	}

	return rules;
}
