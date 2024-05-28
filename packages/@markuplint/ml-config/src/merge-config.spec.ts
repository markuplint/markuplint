import { describe, test, expect } from 'vitest';

import { mergeConfig, mergeRule } from './merge-config.js';

describe('mergeConfig', () => {
	test('empty + empty', () => {
		expect(mergeConfig({}, {})).toStrictEqual({});
	});

	test('plugins + plugins', () => {
		expect(
			mergeConfig(
				{
					plugins: ['a', 'b', 'c'],
				},
				{
					plugins: ['c', 'b', 'd'],
				},
			),
		).toStrictEqual({
			plugins: [
				{
					name: 'a',
				},
				{
					name: 'b',
				},
				{
					name: 'c',
				},
				{
					name: 'd',
				},
			],
		});
	});

	test('plugins + plugins (with options)', () => {
		expect(
			mergeConfig(
				{
					plugins: ['a', 'b', { name: 'c', settings: { foo: 'foo', bar: 'bar' } }],
				},
				{
					plugins: ['c', 'b', 'd', { name: 'c', settings: { foo2: 'foo2', bar: 'bar2' } }],
				},
			),
		).toStrictEqual({
			plugins: [
				{
					name: 'a',
				},
				{
					name: 'b',
				},
				{
					name: 'c',
					settings: {
						bar: 'bar2',
						foo: 'foo',
						foo2: 'foo2',
					},
				},
				{
					name: 'd',
				},
			],
		});
	});

	test('parser + parser', () => {
		expect(
			mergeConfig(
				{
					parser: { '/\\.vue$/i': '@markuplint/vue-parser' },
				},
				{
					parser: { '/\\.vue$/i': '@markuplint/vue-parser' },
				},
			),
		).toStrictEqual({
			parser: { '/\\.vue$/i': '@markuplint/vue-parser' },
		});
	});

	test('parser + parser (2)', () => {
		expect(
			mergeConfig(
				{
					parser: { '/\\.vue$/i': '@markuplint/vue-parser' },
				},
				{
					parser: { '/\\.[jt]sx?$/i': '@markuplint/jsx-parser' },
				},
			),
		).toStrictEqual({
			parser: {
				'/\\.vue$/i': '@markuplint/vue-parser',
				'/\\.[jt]sx?$/i': '@markuplint/jsx-parser',
			},
		});
	});

	test('overrides + overrides', () => {
		expect(
			mergeConfig(
				{
					overrides: {
						a: {
							rules: {
								rule1: true,
							},
						},
					},
				},
				{
					overrides: {
						a: {
							rules: {
								rule1: false,
							},
						},
						b: {
							rules: {
								rule1: true,
							},
						},
					},
				},
			),
		).toStrictEqual({
			overrides: {
				a: {
					rules: {
						rule1: false,
					},
				},
				b: {
					rules: {
						rule1: true,
					},
				},
			},
		});
	});

	test('rules + rules', () => {
		expect(
			mergeConfig(
				{
					rules: {
						a: {
							// @ts-ignore
							option: {
								ruleA: true,
							},
						},
					},
				},
				{
					rules: {
						b: {
							options: {
								ruleB: true,
							},
						},
					},
				},
			),
		).toStrictEqual({
			rules: {
				a: {
					options: {
						ruleA: true,
					},
				},
				b: {
					options: {
						ruleB: true,
					},
				},
			},
		});
	});

	test('rules[rule].value + rules[rule].value', () => {
		expect(
			mergeConfig(
				{
					rules: {
						ruleA: true,
						ruleB: [],
					},
				},
				{
					rules: {
						ruleA: {
							options: {
								optionName: true,
							},
						},
						ruleB: {
							options: {
								optionName: true,
							},
						},
					},
				},
			),
		).toStrictEqual({
			rules: {
				ruleA: {
					value: true,
					options: {
						optionName: true,
					},
				},
				ruleB: {
					value: [],
					options: {
						optionName: true,
					},
				},
			},
		});
	});
});

describe('mergeRule', () => {
	test('{value} + shorthand', () => {
		expect(
			mergeRule(
				{
					value: true,
				},
				{},
			),
		).toStrictEqual({
			value: true,
		});
	});

	test('{value} + shorthand (2)', () => {
		expect(
			mergeRule(
				{
					value: true,
				},
				false,
			),
		).toStrictEqual(false);
	});

	test('{value} + shorthand (3)', () => {
		expect(
			mergeRule(
				{
					value: false,
				},
				true,
			),
		).toStrictEqual({
			value: true,
		});
	});

	test('{options} + {options}', () => {
		expect(
			mergeRule(
				{
					options: {
						optional: 'OPTIONAL_VALUE',
					},
				},
				{
					options: {
						optional: 'CHANGED_OPTIONAL_VALUE',
					},
				},
			),
		).toStrictEqual({
			options: {
				optional: 'CHANGED_OPTIONAL_VALUE',
			},
		});
	});

	test('{value} + empty', () => {
		expect(
			mergeRule(
				{
					value: [],
				},
				{},
			),
		).toStrictEqual({
			value: [],
		});
	});

	test('{value} + {options}', () => {
		expect(
			mergeRule(
				{
					value: [],
				},
				{
					options: {},
				},
			),
		).toStrictEqual({
			value: [],
			options: {},
		});
	});
});

describe('Preteners', () => {
	test('test', () => {
		expect(
			mergeConfig(
				{
					pretenders: [
						{
							selector: 'MyComponent',
							as: 'div',
						},
					],
				},
				{
					pretenders: {
						files: ['./pretenders.json'],
					},
				},
			),
		).toStrictEqual({
			pretenders: {
				files: ['./pretenders.json'],
				data: [
					{
						selector: 'MyComponent',
						as: 'div',
					},
				],
			},
		});
	});

	test('test', () => {
		expect(
			mergeConfig(
				{
					pretenders: [
						{
							selector: 'MyComponent',
							as: 'div',
						},
					],
				},
				{
					pretenders: undefined,
				},
			),
		).toStrictEqual({
			pretenders: {
				data: [
					{
						selector: 'MyComponent',
						as: 'div',
					},
				],
			},
		});
	});

	test('test', () => {
		expect(
			mergeConfig(
				{
					pretenders: [
						{
							selector: 'MyComponent',
							as: 'div',
						},
					],
				},
				{
					pretenders: {
						files: ['../pretenders.json'],
						data: [
							{
								selector: 'MyComponent2',
								as: 'section',
							},
						],
					},
				},
			),
		).toStrictEqual({
			pretenders: {
				files: ['../pretenders.json'],
				data: [
					{
						selector: 'MyComponent',
						as: 'div',
					},
					{
						selector: 'MyComponent2',
						as: 'section',
					},
				],
			},
		});
	});
});
