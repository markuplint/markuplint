import { describe, expect, test } from 'vitest';

import {
	CONFIG_ERROR_RULE_ID,
	createConfigErrorViolations,
	createConfigViolationsOf,
	createRuleNotFoundViolations,
} from './config-violations.js';
import { createRule } from './ml-rule/create-test-rule.js';
import { Ruleset } from './ruleset/index.js';

function dummyRule(name: string) {
	return createRule({
		name,
		defaultSeverity: 'error',
		verify() {
			// noop
		},
	});
}

const warning = (message: string) => ({
	ruleId: CONFIG_ERROR_RULE_ID,
	severity: 'warning',
	message,
	col: 1,
	line: 1,
	raw: '',
});

describe('createConfigErrorViolations', () => {
	test('is one warning for each error, in order', () => {
		expect(createConfigErrorViolations([new Error('first'), new Error('second')])).toStrictEqual([
			warning('first'),
			warning('second'),
		]);
	});

	test('is none for no error', () => {
		expect(createConfigErrorViolations([])).toStrictEqual([]);
	});
});

describe('createRuleNotFoundViolations', () => {
	const none = new Set<string>();

	test('reports a rule of `rules` that is not defined', () => {
		const ruleset = {
			rules: { 'no-such-rule': true },
			nodeRules: [],
			childNodeRules: [],
			knownNamedRuleGroupKeys: none,
		};

		expect(createRuleNotFoundViolations(ruleset, [dummyRule('known')])).toStrictEqual([
			warning('Rule not found: no-such-rule'),
		]);
	});

	test('does not report a rule that is defined', () => {
		const ruleset = { rules: { known: true }, nodeRules: [], childNodeRules: [], knownNamedRuleGroupKeys: none };

		expect(createRuleNotFoundViolations(ruleset, [dummyRule('known')])).toStrictEqual([]);
	});

	test('reports a rule of `nodeRules` and of `childNodeRules`, once for each name', () => {
		const ruleset = {
			rules: {},
			nodeRules: [{ selector: 'p', rules: { missing: true } }],
			childNodeRules: [{ selector: 'ul', rules: { missing: true, 'missing-too': true } }],
			knownNamedRuleGroupKeys: none,
		};

		expect(createRuleNotFoundViolations(ruleset, [])).toStrictEqual([
			warning('Rule not found: missing'),
			warning('Rule not found: missing-too'),
		]);
	});

	test('skips a namespace wildcard', () => {
		const ruleset = {
			rules: { 'a11y/*': false },
			nodeRules: [],
			childNodeRules: [],
			knownNamedRuleGroupKeys: none,
		};

		expect(createRuleNotFoundViolations(ruleset, [])).toStrictEqual([]);
	});

	test('skips a named rule group that is disabled, but not a rule that only looks like one', () => {
		const ruleset = {
			rules: { 'group/off': false, 'typo/off': false },
			nodeRules: [],
			childNodeRules: [],
			knownNamedRuleGroupKeys: new Set(['group/off']),
		};

		expect(createRuleNotFoundViolations(ruleset, [])).toStrictEqual([warning('Rule not found: typo/off')]);
	});
});

describe('createConfigViolationsOf', () => {
	test('puts the rules not found ahead of the errors of the config and of the expansion', () => {
		const ruleset = new Ruleset({
			rules: { 'no-such-rule': true },
			nodeRules: [{ name: 'nosep', selector: 'p', rules: { known: true } }],
		});

		expect(createConfigViolationsOf(ruleset, [dummyRule('known')], [new Error('from the config')])).toStrictEqual([
			warning('Rule not found: no-such-rule'),
			warning('from the config'),
			warning('Named nodeRule name must contain "/" (e.g., "scope/rule-name"): "nosep"'),
		]);
	});

	test('does not report a virtual rule that a named node rule made', () => {
		const ruleset = new Ruleset({
			nodeRules: [{ name: 'scope/known-in-p', selector: 'p', rules: { known: true } }],
		});

		expect(createConfigViolationsOf(ruleset, [dummyRule('known')], [])).toStrictEqual([]);
	});

	test('reports the base rule of a named rule group that is not found', () => {
		const ruleset = new Ruleset({ rules: { 'group/missing': true } });

		expect(createConfigViolationsOf(ruleset, [dummyRule('known')], [])).toStrictEqual([
			warning('Rule not found: group/missing'),
		]);
	});
});
