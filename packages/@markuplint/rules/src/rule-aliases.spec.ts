import { describe, expect, test } from 'vitest';

import rules from './index.js';
import { ruleAliasTable } from './rule-aliases.js';

/**
 * Meta-test for `ruleAliasTable` (v5 rule-system redesign, PR #3989). See
 * `@markuplint/ml-config`'s `rule-aliases.spec.ts` for the engine mechanics
 * this table feeds into — this file only checks the table's own data is
 * internally consistent with the current registry.
 */
describe('ruleAliasTable registry contract', () => {
	test('no deprecated name shadows a currently-registered rule', () => {
		const shadowing = Object.keys(ruleAliasTable).filter(name => name in rules);
		expect(shadowing, `deprecated names that are also live rule names: ${shadowing.join(', ')}`).toEqual([]);
	});

	test('every declared target is a currently-registered rule', () => {
		const unknownTargets: string[] = [];
		for (const [deprecatedName, entry] of Object.entries(ruleAliasTable)) {
			for (const target of entry.targets) {
				if (!(target in rules)) {
					unknownTargets.push(`${deprecatedName} -> ${target}`);
				}
			}
		}
		expect(unknownTargets, `alias targets with no matching rule: ${unknownTargets.join(', ')}`).toEqual([]);
	});
});
