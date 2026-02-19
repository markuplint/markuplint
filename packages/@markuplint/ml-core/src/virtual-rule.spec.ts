import { describe, test, expect } from 'vitest';

import { createRule } from './ml-rule/create-test-rule.js';
import { expandNamedNodeRules } from './virtual-rule.js';

function createDummyRule(name: string, defaultSeverity: 'error' | 'warning' | 'info' = 'error') {
	return createRule({
		name,
		defaultSeverity,
		verify() {
			// noop
		},
	});
}

describe('expandNamedNodeRules', () => {
	// --- Normal cases ---

	test('creates virtual rule from valid named nodeRule', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'a11y/html-lang',
					selector: ':where(html)',
					rules: { 'required-attr': ['lang'] },
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules).toHaveLength(1);
		expect(result.virtualRules[0]!.name).toBe('a11y/html-lang');
		expect(result.virtualRules[0]!.baseRuleId).toBe('required-attr');
		expect(result.virtualRules[0]!.defaultSeverity).toBe('error');
	});

	test('inherits base rule defaultSeverity regardless of specConformance', () => {
		const baseRule = createDummyRule('required-attr', 'warning');
		const result = expandNamedNodeRules(
			[
				{
					name: 'html-standard/charset',
					specConformance: 'normative' as const,
					selector: ':where(head)',
					rules: { 'required-attr': ['charset'] },
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		// specConformance does not change defaultSeverity — it's metadata only
		expect(result.virtualRules[0]!.defaultSeverity).toBe('warning');
	});

	test('specConformance is set as metadata on virtual rule', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'html-standard/charset',
					specConformance: 'normative' as const,
					selector: ':where(head)',
					rules: { 'required-attr': ['charset'] },
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules[0]!.specConformance).toBe('normative');
	});

	test('unnamed nodeRules pass through unchanged', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					selector: ':where(html)',
					rules: { 'required-attr': ['lang'] },
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules).toHaveLength(0);
		expect(result.transformedNodeRules).toHaveLength(1);
		expect(result.transformedNodeRules[0]).toStrictEqual({
			selector: ':where(html)',
			rules: { 'required-attr': ['lang'] },
		});
	});

	test('mixed named + unnamed nodeRules are split correctly', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					selector: ':where(img)',
					rules: { 'required-attr': ['alt'] },
				},
				{
					name: 'a11y/html-lang',
					selector: ':where(html)',
					rules: { 'required-attr': ['lang'] },
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules).toHaveLength(1);
		// 1 unnamed passthrough + 1 transformed named
		expect(result.transformedNodeRules).toHaveLength(2);
	});

	test('false entries are separated into unnamed nodeRules', () => {
		const disallowedElement = createDummyRule('disallowed-element');
		const requireAccessibleName = createDummyRule('require-accessible-name');
		const result = expandNamedNodeRules(
			[
				{
					name: 'html-standard/figure-no-caption',
					specConformance: 'non-normative' as const,
					selector: ':where(figcaption ~ table)',
					rules: {
						'disallowed-element': { value: ['caption'] },
						'require-accessible-name': false,
					},
				},
			],
			[disallowedElement, requireAccessibleName],
		);

		expect(result.errors).toHaveLength(0);
		// 1 virtual rule for disallowed-element (single non-false entry → uses name directly)
		expect(result.virtualRules).toHaveLength(1);
		expect(result.virtualRules[0]!.name).toBe('html-standard/figure-no-caption');
		expect(result.virtualRules[0]!.baseRuleId).toBe('disallowed-element');
		expect(result.virtualRules[0]!.groupName).toBeUndefined();

		// 2 transformed nodeRules:
		// 1. unnamed with require-accessible-name: false (separated)
		// 2. named with alias key
		expect(result.transformedNodeRules).toHaveLength(2);

		// false entry is emitted first (before named entries) in transformedNodeRules
		const falseNodeRule = result.transformedNodeRules[0]!;
		expect(falseNodeRule.rules).toStrictEqual({ 'require-accessible-name': false });
		expect(falseNodeRule).not.toHaveProperty('name');
	});

	test('multi-entry non-false creates derived names with groupName', () => {
		const disallowedElement = createDummyRule('disallowed-element');
		const requiredAttr = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'custom/multi-check',
					selector: ':where(div)',
					rules: {
						'disallowed-element': ['span'],
						'required-attr': ['id'],
					},
				},
			],
			[disallowedElement, requiredAttr],
		);

		expect(result.errors).toHaveLength(0);
		// 2 virtual rules with derived names
		expect(result.virtualRules).toHaveLength(2);

		const names = result.virtualRules.map(r => r.name).toSorted();
		expect(names).toStrictEqual(['custom/multi-check/disallowed-element', 'custom/multi-check/required-attr']);

		// Both should have groupName set
		for (const rule of result.virtualRules) {
			expect(rule.groupName).toBe('custom/multi-check');
		}
	});

	// --- Validation errors ---

	test('rejects name without /', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'invalid-name',
					selector: ':where(html)',
					rules: { 'required-attr': ['lang'] },
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]!.message).toContain('"invalid-name"');
		expect(result.virtualRules).toHaveLength(0);
	});

	test('rejects all-false rules entries', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'scope/all-false',
					selector: ':where(html)',
					rules: { 'required-attr': false },
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]!.message).toContain('at least one non-false');
	});

	test('rejects empty rules', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'scope/empty',
					selector: ':where(html)',
					rules: {},
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]!.message).toContain('at least one non-false');
	});

	test('rejects non-existent base rule', () => {
		const result = expandNamedNodeRules(
			[
				{
					name: 'scope/missing',
					selector: ':where(html)',
					rules: { 'nonexistent-rule': true },
				},
			],
			[],
		);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]!.message).toContain('not found');
	});

	test('rejects name collision with existing rule', () => {
		const existingRule = createDummyRule('scope/existing');
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'scope/existing',
					selector: ':where(html)',
					rules: { 'required-attr': ['lang'] },
				},
			],
			[existingRule, baseRule],
		);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]!.message).toContain('conflicts');
	});

	test('rejects duplicate alias names', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'a11y/html-lang',
					selector: ':where(html)',
					rules: { 'required-attr': ['lang'] },
				},
				{
					name: 'a11y/html-lang',
					selector: ':where(html)',
					rules: { 'required-attr': ['dir'] },
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]!.message).toContain('Duplicate');
	});

	test('works with regexSelector-based named nodeRule', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'a11y/data-label',
					regexSelector: { attrName: 'data-.*' },
					rules: { 'required-attr': ['aria-label'] },
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules).toHaveLength(1);
		expect(result.virtualRules[0]!.name).toBe('a11y/data-label');

		// regexSelector is preserved in transformed nodeRule
		const transformed = result.transformedNodeRules[0]!;
		expect((transformed as { regexSelector?: unknown }).regexSelector).toStrictEqual({ attrName: 'data-.*' });
		expect('name' in transformed && transformed.name).toBeFalsy();
	});

	test('multi-entry with mixed false and non-false creates correct virtual rules and separations', () => {
		const ruleA = createDummyRule('required-attr');
		const ruleB = createDummyRule('disallowed-element');
		const ruleC = createDummyRule('require-accessible-name');
		const result = expandNamedNodeRules(
			[
				{
					name: 'custom/complex',
					selector: ':where(div)',
					rules: {
						'required-attr': ['id'],
						'disallowed-element': ['span'],
						'require-accessible-name': false,
					},
				},
			],
			[ruleA, ruleB, ruleC],
		);

		expect(result.errors).toHaveLength(0);
		// 2 virtual rules for non-false entries
		expect(result.virtualRules).toHaveLength(2);
		// Both should have groupName
		for (const rule of result.virtualRules) {
			expect(rule.groupName).toBe('custom/complex');
		}
		// 3 transformed nodeRules: 1 false + 2 named
		expect(result.transformedNodeRules).toHaveLength(3);
	});

	test('multi-entry with one invalid base rule still creates virtual rule for valid entry', () => {
		const validRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'custom/partial',
					selector: ':where(div)',
					rules: {
						'required-attr': ['id'],
						'nonexistent-rule': true,
					},
				},
			],
			[validRule],
		);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]!.message).toContain('nonexistent-rule');
		// Valid entry's virtual rule is still created (partial success)
		expect(result.virtualRules).toHaveLength(1);
		expect(result.virtualRules[0]!.name).toBe('custom/partial/required-attr');
		expect(result.virtualRules[0]!.groupName).toBe('custom/partial');
	});

	test('rejects derived name collision with existing rule', () => {
		const existingRule = createDummyRule('custom/multi/required-attr');
		const baseRule = createDummyRule('required-attr');
		const otherRule = createDummyRule('disallowed-element');
		const result = expandNamedNodeRules(
			[
				{
					name: 'custom/multi',
					selector: ':where(div)',
					rules: {
						'required-attr': ['id'],
						'disallowed-element': ['span'],
					},
				},
			],
			[existingRule, baseRule, otherRule],
		);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]!.message).toContain('conflicts');
	});

	test('empty nodeRules array returns empty results', () => {
		const result = expandNamedNodeRules([], []);
		expect(result.virtualRules).toHaveLength(0);
		expect(result.transformedNodeRules).toHaveLength(0);
		expect(result.errors).toHaveLength(0);
	});

	test('named nodeRule with undefined rules is treated as empty rules', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'scope/no-rules',
					selector: ':where(div)',
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]!.message).toContain('at least one non-false');
	});

	// --- Error accumulation & continuation ---

	test('multiple validation errors are accumulated', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'no-slash',
					selector: ':where(html)',
					rules: { 'required-attr': ['lang'] },
				},
				{
					name: 'scope/empty-rules',
					selector: ':where(html)',
					rules: {},
				},
				{
					name: 'scope/missing-base',
					selector: ':where(html)',
					rules: { 'nonexistent-rule': true },
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(3);
		expect(result.virtualRules).toHaveLength(0);
	});

	test('valid entries are processed after preceding errors', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'no-slash',
					selector: ':where(html)',
					rules: { 'required-attr': ['lang'] },
				},
				{
					name: 'scope/valid',
					selector: ':where(html)',
					rules: { 'required-attr': ['lang'] },
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(1);
		expect(result.virtualRules).toHaveLength(1);
		expect(result.virtualRules[0]!.name).toBe('scope/valid');
	});

	// --- Name format edge cases ---

	test('name with multiple slashes is valid', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'scope/sub/deep-rule',
					selector: ':where(html)',
					rules: { 'required-attr': ['lang'] },
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules).toHaveLength(1);
		expect(result.virtualRules[0]!.name).toBe('scope/sub/deep-rule');
	});

	test('virtual rule without specConformance has it undefined', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'scope/rule',
					selector: ':where(html)',
					rules: { 'required-attr': ['lang'] },
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules[0]!.specConformance).toBeUndefined();
	});
});

describe('MLRule.createAlias', () => {
	test('alias rule has correct baseRuleId', () => {
		const baseRule = createDummyRule('required-attr');
		const alias = baseRule.createAlias('a11y/html-lang');

		expect(alias.name).toBe('a11y/html-lang');
		expect(alias.baseRuleId).toBe('required-attr');
	});

	test('alias rule inherits defaultSeverity by default', () => {
		const baseRule = createDummyRule('required-attr', 'warning');
		const alias = baseRule.createAlias('a11y/html-lang');

		expect(alias.defaultSeverity).toBe('warning');
	});

	test('alias rule overrides defaultSeverity', () => {
		const baseRule = createDummyRule('required-attr', 'error');
		const alias = baseRule.createAlias('a11y/html-lang', { defaultSeverity: 'info' });

		expect(alias.defaultSeverity).toBe('info');
	});

	test('alias rule preserves specConformance', () => {
		const baseRule = createDummyRule('required-attr');
		const alias = baseRule.createAlias('a11y/html-lang', { specConformance: 'normative' });

		expect(alias.specConformance).toBe('normative');
	});

	test('alias rule preserves groupName', () => {
		const baseRule = createDummyRule('required-attr');
		const alias = baseRule.createAlias('custom/multi/required-attr', { groupName: 'custom/multi' });

		expect(alias.groupName).toBe('custom/multi');
	});

	test('regular rule has no baseRuleId', () => {
		const rule = createDummyRule('required-attr');
		expect(rule.baseRuleId).toBeUndefined();
	});
});

describe('expandNamedNodeRules with childNodeRules', () => {
	test('works with childNodeRule-specific properties', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedNodeRules(
			[
				{
					name: 'a11y/section-heading',
					selector: ':where(section)',
					inheritance: true,
					rules: { 'required-attr': ['aria-label'] },
				},
			],
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules).toHaveLength(1);
		expect(result.virtualRules[0]!.name).toBe('a11y/section-heading');

		// Transformed nodeRule should preserve inheritance
		const transformed = result.transformedNodeRules[0]!;
		expect((transformed as { inheritance?: boolean }).inheritance).toBe(true);
		expect('name' in transformed && transformed.name).toBeFalsy();
	});
});
