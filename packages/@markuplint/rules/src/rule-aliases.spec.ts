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

/**
 * Regression coverage for the `isDisabled()`/`withOptions()` fix: disabling a
 * deprecated rule name (bare `false` or `{ value: false, ... }`) must disable
 * every successor it expands to, not silently re-enable them. Every custom
 * `expand` function in `rule-aliases.ts` routes through `withOptions()`, so
 * exercising a representative sample here covers the shared code path.
 */
describe('custom expand functions handle disabling', () => {
	test('bare false disables every target (landmark-roles)', () => {
		const expanded = ruleAliasTable['landmark-roles']!.expand(false);
		expect(expanded).toStrictEqual({
			'no-nested-top-level-landmark': false,
			'require-landmark-label': false,
		});
	});

	test('{ value: false } disables every target (required-h1)', () => {
		const expanded = ruleAliasTable['required-h1']!.expand({ value: false });
		expect(expanded).toStrictEqual({
			'require-h1': false,
			'no-duplicate-h1': false,
		});
	});

	test('bare false disables all 21 wai-aria successors', () => {
		const expanded = ruleAliasTable['wai-aria']!.expand(false);
		for (const target of ruleAliasTable['wai-aria']!.targets) {
			expect(expanded[target]).toBe(false);
		}
		expect(Object.keys(expanded)).toHaveLength(ruleAliasTable['wai-aria']!.targets.length);
	});

	test('bare false disables the always-included invalid-attr targets, not just the conditional one', () => {
		const expanded = ruleAliasTable['invalid-attr']!.expand(false);
		expect(expanded).toStrictEqual({
			'no-unknown-attr': false,
			'no-disallowed-attr': false,
			'no-invalid-attr-value': false,
			// no-restricted-attr is omitted: no `disallowAttrs` was configured,
			// same as the enabled case — its inclusion is independent of disabling.
		});
	});

	test('true still expands normally (no regression on the enabled path)', () => {
		const expanded = ruleAliasTable['landmark-roles']!.expand(true);
		expect(expanded).toStrictEqual({
			'no-nested-top-level-landmark': { value: true },
			'require-landmark-label': { value: true },
		});
	});
});
