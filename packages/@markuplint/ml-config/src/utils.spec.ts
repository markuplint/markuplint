import { describe, test, expect } from 'vitest';

import {
	cleanOptions,
	deleteUndefProp,
	exchangeValueOnRule,
	isNamedRuleGroup,
	isRuleConfigValue,
	provideValue,
} from './utils.js';

test('provideValue', () => {
	expect(
		provideValue('The name is {{ dataName }}', {
			$0: 'data-hoge',
			$1: 'hoge',
			dataName: 'hoge',
		}),
	).toBe('The name is hoge');

	expect(provideValue('The name is {{ dataName }}', {})).toBeUndefined();

	expect(
		provideValue('No variable', {
			$0: 'data-hoge',
			$1: 'hoge',
			dataName: 'hoge',
		}),
	).toBe('No variable');
});

describe('isRuleConfigValue', () => {
	test('string is true', () => {
		expect(isRuleConfigValue('always')).toBe(true);
	});

	test('number is true', () => {
		expect(isRuleConfigValue(42)).toBe(true);
	});

	test('boolean is true', () => {
		expect(isRuleConfigValue(true)).toBe(true);
		expect(isRuleConfigValue(false)).toBe(true);
	});

	test('null is true', () => {
		expect(isRuleConfigValue(null)).toBe(true);
	});

	test('array is true', () => {
		expect(isRuleConfigValue(['a', 'b'])).toBe(true);
	});

	test('object is false', () => {
		expect(isRuleConfigValue({})).toBe(false);
	});

	test('undefined is false', () => {
		// eslint-disable-next-line unicorn/no-useless-undefined
		expect(isRuleConfigValue(undefined)).toBe(false);
	});
});

describe('deleteUndefProp', () => {
	test('removes undefined properties', () => {
		const obj: Record<string, unknown> = { a: 1, b: undefined, c: 'hello' };
		deleteUndefProp(obj);
		expect(obj).toStrictEqual({ a: 1, c: 'hello' });
	});

	test('does nothing for non-plain-objects', () => {
		const arr = [1, undefined, 3];
		deleteUndefProp(arr);
		expect(arr).toStrictEqual([1, undefined, 3]);

		const str = 'hello';
		deleteUndefProp(str);
		expect(str).toBe('hello');
	});
});

describe('cleanOptions', () => {
	test('removes undefined fields', () => {
		expect(cleanOptions({ severity: 'error', value: true })).toStrictEqual({
			severity: 'error',
			value: true,
		});
	});

	test('keeps only standard fields', () => {
		// @ts-ignore -- extra fields for testing
		expect(cleanOptions({ severity: 'error', value: true, extraField: 'ignored' })).toStrictEqual({
			severity: 'error',
			value: true,
		});
	});

	test('keeps reasonOnly', () => {
		expect(cleanOptions({ severity: 'error', value: true, reason: 'because', reasonOnly: true })).toStrictEqual({
			severity: 'error',
			value: true,
			reason: 'because',
			reasonOnly: true,
		});
	});
});

test('exchangeValueOnRule', () => {
	expect(
		exchangeValueOnRule('The name is {{ dataName }}', {
			$0: 'data-hoge',
			$1: 'hoge',
			dataName: 'hoge',
		}),
	).toBe('The name is hoge');

	expect(
		exchangeValueOnRule(
			{
				value: 'The name is {{ dataName }}',
			},
			{
				$0: 'data-hoge',
				$1: 'hoge',
				dataName: 'hoge',
			},
		),
	).toStrictEqual({
		value: 'The name is hoge',
	});

	expect(
		exchangeValueOnRule(
			{
				severity: 'error',
				value: 'The name is {{ dataName }}',
				reason: 'For {{ dataName }}',
			},
			{
				$0: 'data-hoge',
				$1: 'hoge',
				dataName: 'hoge',
			},
		),
	).toStrictEqual({
		severity: 'error',
		value: 'The name is hoge',
		reason: 'For hoge',
	});

	expect(
		exchangeValueOnRule(
			{
				value: 'The name is {{ dataName }}',
				options: {
					propA: 'The name is {{ dataName }}',
					propB: ['The name is {{ dataName }}'],
					propC: {
						prop: 'The name is {{ dataName }}',
					},
				},
			},
			{
				dataName: 'hoge',
			},
		),
	).toStrictEqual({
		value: 'The name is hoge',
		options: {
			propA: 'The name is hoge',
			propB: ['The name is hoge'],
			propC: {
				prop: 'The name is hoge',
			},
		},
	});

	expect(
		exchangeValueOnRule(
			{
				value: 'The name is {{ dataName }}',
				options: {
					propA: 'The name is {{ dataName }}',
					propB: ['The name is {{ dataName }}'],
					propC: {
						prop: 'The name is {{ dataName }}',
					},
				},
			},
			{
				dataName: 'hoge',
			},
		),
	).toStrictEqual({
		value: 'The name is hoge',
		options: {
			propA: 'The name is hoge',
			propB: ['The name is hoge'],
			propC: {
				prop: 'The name is hoge',
			},
		},
	});
});

describe('exchangeValueOnRule edge cases', () => {
	test('boolean value is returned as-is', () => {
		expect(exchangeValueOnRule(true, { dataName: 'hoge' })).toBe(true);
	});

	test('number value is returned as-is', () => {
		expect(exchangeValueOnRule(42, { dataName: 'hoge' })).toBe(42);
	});

	test('null value returns null', () => {
		expect(exchangeValueOnRule(null, { dataName: 'hoge' })).toBeNull();
	});

	test('reason becomes undefined when template rendering fails', () => {
		const result = exchangeValueOnRule(
			{
				value: 'static',
				reason: '{{ missingVar }}',
			},
			{ dataName: 'hoge' },
		);
		expect(result).toStrictEqual({
			value: 'static',
		});
	});
});

describe('isNamedRuleGroup', () => {
	test('object with rules property is a NamedRuleGroup', () => {
		expect(isNamedRuleGroup({ rules: { 'id-duplication': true } })).toBe(true);
	});

	test('object with rules and specConformance', () => {
		expect(isNamedRuleGroup({ specConformance: 'normative', rules: { 'id-duplication': true } })).toBe(true);
	});

	test('object with rules and severity', () => {
		expect(isNamedRuleGroup({ severity: 'warning', rules: { 'id-duplication': true } })).toBe(true);
	});

	test('false is not a NamedRuleGroup', () => {
		expect(isNamedRuleGroup(false)).toBe(false);
	});

	test('string is not a NamedRuleGroup', () => {
		expect(isNamedRuleGroup('warning')).toBe(false);
	});

	test('array is not a NamedRuleGroup', () => {
		expect(isNamedRuleGroup(['id', 'class'])).toBe(false);
	});

	test('null is not a NamedRuleGroup', () => {
		expect(isNamedRuleGroup(null)).toBe(false);
	});

	test('undefined is not a NamedRuleGroup', () => {
		// eslint-disable-next-line unicorn/no-useless-undefined
		expect(isNamedRuleGroup(undefined)).toBe(false);
	});

	test('number is not a NamedRuleGroup', () => {
		expect(isNamedRuleGroup(42)).toBe(false);
	});

	test('true is not a NamedRuleGroup', () => {
		expect(isNamedRuleGroup(true)).toBe(false);
	});

	test('object with rules: null is not a NamedRuleGroup', () => {
		expect(isNamedRuleGroup({ rules: null })).toBe(false);
	});

	test('object with rules as array is not a NamedRuleGroup', () => {
		expect(isNamedRuleGroup({ rules: [] })).toBe(false);
	});

	test('RuleConfig with value and options is not a NamedRuleGroup', () => {
		expect(isNamedRuleGroup({ value: true, options: { foo: 'bar' } })).toBe(false);
	});

	test('object with rules as string is not a NamedRuleGroup', () => {
		expect(isNamedRuleGroup({ rules: 'not-an-object' })).toBe(false);
	});
});
