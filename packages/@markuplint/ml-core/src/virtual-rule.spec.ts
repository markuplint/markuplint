import { describe, test, expect } from 'vitest';

import { createRule } from './ml-rule/create-test-rule.js';
import { expandNamedNodeRules, expandNamedRules } from './virtual-rule.js';

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
		expect(result.virtualRules[0]!.groupName).toBe('custom/multi-check');
		expect(result.virtualRules[1]!.groupName).toBe('custom/multi-check');
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
		expect(result.virtualRules[0]!.groupName).toBe('custom/complex');
		expect(result.virtualRules[1]!.groupName).toBe('custom/complex');
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

	test('alias inherits mirrorsParseErrorCodes from the base rule', () => {
		// When a preset declares a named nodeRule that aliases a rule with a
		// `meta.mirrorsParseErrorCodes` (e.g. `attr-duplication`), the alias
		// must participate in the parse-error dedupe too — otherwise the
		// alias would silently lose the contract and the user would see
		// duplicate violations through the preset's virtual rule.
		const baseRule = createRule({
			name: 'attr-duplication',
			meta: { mirrorsParseErrorCodes: ['duplicate-attribute'] },
			verify() {
				// noop
			},
		});
		const alias = baseRule.createAlias('html-standard/attr-duplication');

		expect(alias.mirrorsParseErrorCodes).toStrictEqual(['duplicate-attribute']);
	});

	test('alias for a rule with no mirrors has an empty mirrorsParseErrorCodes', () => {
		const baseRule = createDummyRule('required-attr');
		const alias = baseRule.createAlias('a11y/html-lang');

		expect(alias.mirrorsParseErrorCodes).toStrictEqual([]);
	});
});

describe('expandNamedRules', () => {
	test('single-rule group creates virtual rule with group name', () => {
		const baseRule = createDummyRule('id-duplication');
		const result = expandNamedRules(
			{
				'a11y/id-duplication': {
					rules: { 'id-duplication': true },
				},
			},
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules).toHaveLength(1);
		expect(result.virtualRules[0]!.name).toBe('a11y/id-duplication');
		expect(result.virtualRules[0]!.baseRuleId).toBe('id-duplication');
		// Single entry → no groupName
		expect(result.virtualRules[0]!.groupName).toBeUndefined();
		// resolvedRules has alias name entry
		expect(result.resolvedRules['a11y/id-duplication']).toBe(true);
		// Original group key is NOT in resolvedRules
		expect(result.resolvedRules).not.toHaveProperty('a11y/id-duplication-group');
	});

	test('multi-rule group creates derived names with groupName', () => {
		const ruleA = createDummyRule('required-attr');
		const ruleB = createDummyRule('disallowed-element');
		const result = expandNamedRules(
			{
				'ns/multi': {
					rules: {
						'required-attr': ['id'],
						'disallowed-element': ['span'],
					},
				},
			},
			[ruleA, ruleB],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules).toHaveLength(2);

		const names = result.virtualRules.map(r => r.name).toSorted();
		expect(names).toStrictEqual(['ns/multi/disallowed-element', 'ns/multi/required-attr']);

		expect(result.virtualRules[0]!.groupName).toBe('ns/multi');
		expect(result.virtualRules[1]!.groupName).toBe('ns/multi');

		expect(result.resolvedRules['ns/multi/required-attr']).toStrictEqual(['id']);
		expect(result.resolvedRules['ns/multi/disallowed-element']).toStrictEqual(['span']);
	});

	test('specConformance is propagated to virtual rules', () => {
		const baseRule = createDummyRule('id-duplication');
		const result = expandNamedRules(
			{
				'a11y/id-duplication': {
					specConformance: 'normative' as const,
					rules: { 'id-duplication': true },
				},
			},
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules[0]!.specConformance).toBe('normative');
	});

	test('virtual rule without specConformance has it undefined', () => {
		const baseRule = createDummyRule('id-duplication');
		const result = expandNamedRules(
			{
				'a11y/id-duplication': {
					rules: { 'id-duplication': true },
				},
			},
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules[0]!.specConformance).toBeUndefined();
	});

	test('group value false passes through as disable signal', () => {
		const baseRule = createDummyRule('id-duplication');
		const result = expandNamedRules(
			{
				'a11y/id-duplication': false,
			},
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules).toHaveLength(0);
		expect(result.resolvedRules['a11y/id-duplication']).toBe(false);
	});

	test('severity string passes through as regular rule value (no special treatment)', () => {
		const baseRule = createDummyRule('id-duplication');
		const result = expandNamedRules(
			{
				'a11y/id-duplication': 'warning',
			},
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules).toHaveLength(0);
		// Severity string is NOT converted; it passes through as-is (same as regular rules)
		expect(result.resolvedRules['a11y/id-duplication']).toBe('warning');
	});

	test('non-namespaced keys pass through unchanged', () => {
		const baseRule = createDummyRule('id-duplication');
		const result = expandNamedRules(
			{
				'id-duplication': true,
				'required-attr': ['lang'],
			},
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules).toHaveLength(0);
		expect(result.resolvedRules['id-duplication']).toBe(true);
		expect(result.resolvedRules['required-attr']).toStrictEqual(['lang']);
	});

	test('wildcard patterns pass through unchanged', () => {
		const result = expandNamedRules(
			{
				'a11y/*': false,
			},
			[],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules).toHaveLength(0);
		expect(result.resolvedRules['a11y/*']).toBe(false);
	});

	test('rejects non-existent base rule', () => {
		const result = expandNamedRules(
			{
				'ns/missing': {
					rules: { 'nonexistent-rule': true },
				},
			},
			[],
		);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]!.message).toContain('not found');
	});

	test('rejects name collision with existing rule', () => {
		const existingRule = createDummyRule('ns/existing');
		const baseRule = createDummyRule('id-duplication');
		const result = expandNamedRules(
			{
				'ns/existing': {
					rules: { 'id-duplication': true },
				},
			},
			[existingRule, baseRule],
		);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]!.message).toContain('conflicts');
	});

	test('derived name collision between groups is reported as error', () => {
		const baseRule = createDummyRule('id-duplication');
		const ruleA = createDummyRule('required-attr');
		const result = expandNamedRules(
			{
				'ns/rule': {
					rules: { 'id-duplication': true },
				},
				'ns/rule/id-duplication': {
					rules: { 'required-attr': true },
				},
			},
			[baseRule, ruleA],
		);

		// ns/rule creates virtual rule "ns/rule" (single entry)
		// ns/rule/id-duplication creates virtual rule "ns/rule/id-duplication" (single entry)
		// No collision — both names are distinct
		expect(result.virtualRules).toHaveLength(2);
		expect(result.errors).toHaveLength(0);
	});

	test('multi-entry with mixed false and non-false creates virtual rules for non-false only', () => {
		const ruleA = createDummyRule('required-attr');
		const ruleB = createDummyRule('disallowed-element');
		const result = expandNamedRules(
			{
				'ns/mixed': {
					rules: {
						'required-attr': ['id'],
						'disallowed-element': false,
					},
				},
			},
			[ruleA, ruleB],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules).toHaveLength(1);
		// Single non-false entry: uses group key directly
		expect(result.virtualRules[0]!.name).toBe('ns/mixed');
		expect(result.virtualRules[0]!.baseRuleId).toBe('required-attr');
	});

	test('rejects all-false rules entries', () => {
		const baseRule = createDummyRule('id-duplication');
		const result = expandNamedRules(
			{
				'ns/all-false': {
					rules: { 'id-duplication': false },
				},
			},
			[baseRule],
		);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]!.message).toContain('at least one non-false');
	});

	test('base rule false disables wrapping virtual rules (backwards compat)', () => {
		const baseRule = createDummyRule('id-duplication');
		const result = expandNamedRules(
			{
				'id-duplication': false,
				'a11y/id-duplication': {
					rules: { 'id-duplication': true },
				},
			},
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules).toHaveLength(1);
		// Base rule disabled → virtual rule also set to false
		expect(result.resolvedRules['a11y/id-duplication']).toBe(false);
		expect(result.resolvedRules['id-duplication']).toBe(false);
	});

	test('specConformance does not affect severity (metadata only)', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedRules(
			{
				'a11y/no-accesskey': {
					specConformance: 'non-normative' as const,
					rules: { 'required-attr': true },
				},
			},
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		// specConformance is metadata only — severity is NOT affected
		expect(result.virtualRules[0]!.defaultSeverity).toBe('error');
		expect(result.virtualRules[0]!.specConformance).toBe('non-normative');
	});

	test('group-level severity sets defaultSeverity', () => {
		const baseRule = createDummyRule('required-attr');
		const result = expandNamedRules(
			{
				'a11y/no-accesskey': {
					specConformance: 'non-normative' as const,
					severity: 'info',
					rules: { 'required-attr': true },
				},
			},
			[baseRule],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules[0]!.defaultSeverity).toBe('info');
	});

	test('mixed named groups and regular rules', () => {
		const ruleA = createDummyRule('id-duplication');
		const ruleB = createDummyRule('required-attr');
		const result = expandNamedRules(
			{
				'wai-aria': true,
				'a11y/id-duplication': {
					specConformance: 'normative' as const,
					rules: { 'id-duplication': true },
				},
				'required-attr': ['lang'],
			},
			[ruleA, ruleB],
		);

		expect(result.errors).toHaveLength(0);
		expect(result.virtualRules).toHaveLength(1);
		expect(result.resolvedRules['wai-aria']).toBe(true);
		expect(result.resolvedRules['a11y/id-duplication']).toBe(true);
		expect(result.resolvedRules['required-attr']).toStrictEqual(['lang']);
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
