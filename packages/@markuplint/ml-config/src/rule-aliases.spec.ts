import { expect, test } from 'vitest';

import { applyRuleAliases } from './rule-aliases.js';

import type { RuleAliasTable } from './rule-aliases.js';

test('[rule-aliases-valid-001] a rule name absent from the table passes through unchanged', () => {
	const { rules, warnings } = applyRuleAliases({ 'no-duplicate-attr': true }, {});
	expect(rules).toStrictEqual({ 'no-duplicate-attr': true });
	expect(warnings).toStrictEqual([]);
});

test('[rule-aliases-valid-002] named rule groups (keys containing "/") are never looked up in the table', () => {
	const table: RuleAliasTable = {
		'old-rule/sub': { expand: () => ({ 'new-rule': true }), targets: ['new-rule'] },
	};
	const { rules, warnings } = applyRuleAliases({ 'old-rule/sub': { rules: { 'some-rule': true } } }, table);
	expect(rules).toStrictEqual({ 'old-rule/sub': { rules: { 'some-rule': true } } });
	expect(warnings).toStrictEqual([]);
});

test('[rule-aliases-invalid-001] a 1:1 rename expands to the new name and reports a warning', () => {
	const table: RuleAliasTable = {
		'old-name': { expand: rule => ({ 'new-name': rule }), targets: ['new-name'] },
	};
	const { rules, warnings } = applyRuleAliases({ 'old-name': { severity: 'warning', value: true } }, table);
	expect(rules).toStrictEqual({ 'new-name': { severity: 'warning', value: true } });
	expect(warnings).toStrictEqual([{ deprecatedName: 'old-name', replacedBy: ['new-name'] }]);
});

test('[rule-aliases-invalid-002] a 1:N split copies the resolved configuration to every replacement', () => {
	const table: RuleAliasTable = {
		'old-compound-rule': {
			expand: rule => ({
				'new-rule-a': rule,
				'new-rule-b': rule,
			}),
			targets: ['new-rule-a', 'new-rule-b'],
		},
	};
	const { rules, warnings } = applyRuleAliases({ 'old-compound-rule': true }, table);
	expect(rules).toStrictEqual({ 'new-rule-a': true, 'new-rule-b': true });
	expect(warnings).toStrictEqual([{ deprecatedName: 'old-compound-rule', replacedBy: ['new-rule-a', 'new-rule-b'] }]);
});

test('[rule-aliases-invalid-003] a split can conditionally omit a replacement based on the old configuration', () => {
	const table: RuleAliasTable = {
		'old-rule-with-suboption': {
			expand: rule => {
				const hasSubOption =
					typeof rule === 'object' && rule !== null && !Array.isArray(rule) && rule.options === true;
				return hasSubOption ? { 'main-check': true, 'sub-check': true } : { 'main-check': true };
			},
			targets: ['main-check', 'sub-check'],
		},
	};
	const enabled = applyRuleAliases({ 'old-rule-with-suboption': { options: true } }, table);
	expect(enabled.rules).toStrictEqual({ 'main-check': true, 'sub-check': true });

	const disabled = applyRuleAliases({ 'old-rule-with-suboption': { options: false } }, table);
	expect(disabled.rules).toStrictEqual({ 'main-check': true });
});

test('[rule-aliases-invalid-004] an explicit setting under the new name wins over the alias-derived one', () => {
	const table: RuleAliasTable = {
		'old-name': { expand: () => ({ 'new-name': { severity: 'warning' } }), targets: ['new-name'] },
	};
	const { rules, warnings } = applyRuleAliases({ 'old-name': true, 'new-name': { severity: 'error' } }, table);
	expect(rules).toStrictEqual({ 'new-name': { severity: 'error' } });
	// The deprecation warning still fires — the user is still using the old name.
	expect(warnings).toStrictEqual([{ deprecatedName: 'old-name', replacedBy: ['new-name'] }]);
});

test('[rule-aliases-invalid-005] two deprecated names that both expand into the same replacement are merged, later wins per key', () => {
	const table: RuleAliasTable = {
		'old-name-a': {
			expand: () => ({ 'shared-target': { severity: 'warning', options: { fromA: true } } }),
			targets: ['shared-target'],
		},
		'old-name-b': { expand: () => ({ 'shared-target': { severity: 'error' } }), targets: ['shared-target'] },
	};
	const { rules, warnings } = applyRuleAliases({ 'old-name-a': true, 'old-name-b': true }, table);
	expect(rules).toStrictEqual({ 'shared-target': { severity: 'error', options: { fromA: true } } });
	expect(warnings).toStrictEqual([
		{ deprecatedName: 'old-name-a', replacedBy: ['shared-target'] },
		{ deprecatedName: 'old-name-b', replacedBy: ['shared-target'] },
	]);
});

test('[rule-aliases-valid-003] `undefined` rules passes through as `undefined` with no warnings', () => {
	const { rules, warnings } = applyRuleAliases(undefined, {
		'old-name': { expand: () => ({ 'new-name': true }), targets: ['new-name'] },
	});
	expect(rules).toBeUndefined();
	expect(warnings).toStrictEqual([]);
});
