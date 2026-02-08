import type { DefaultRules } from './types.js';
import type { Writable } from 'type-fest';

import builtinRules from '@markuplint/rules';

/**
 * Collects all built-in rules that have a defined category and returns them
 * as a record of rule name to rule metadata.
 *
 * Rules with `'warning'` default severity are disabled by default (`false`),
 * while all others use their defined default value or `true`.
 *
 * @returns A read-only mapping from rule names to their category and default configuration value.
 */
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
