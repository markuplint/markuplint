import { mlTest } from 'markuplint';
import rule from './';

test('warns if specified attribute is not appeared', async () => {
	const { violations } = await mlTest(
		'<img src="/path/to/image.png">',
		{
			rules: {
				'required-attr': true,
			},
			nodeRules: [
				{
					tagName: 'img',
					rules: {
						'required-attr': {
							severity: 'error',
							value: 'alt',
						},
					},
				},
			],
		},
		[rule],
		'en',
	);

	expect(violations).toStrictEqual([
		{
			col: 1,
			line: 1,
			message: "Required 'alt' on '<img>'",
			raw: '<img src="/path/to/image.png">',
			ruleId: 'required-attr',
			severity: 'error',
		},
	]);
});

test('multiple required attributes', async () => {
	const { violations } = await mlTest(
		'<img src="/path/to/image.png">',
		{
			rules: {
				'required-attr': true,
			},
			nodeRules: [
				{
					tagName: 'img',
					rules: {
						'required-attr': {
							severity: 'error',
							value: ['width', 'height', 'alt'],
						},
					},
				},
			],
		},
		[rule],
		'en',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: "Required 'alt' on '<img>'",
			line: 1,
			col: 1,
			raw: '<img src="/path/to/image.png">',
			ruleId: 'required-attr',
		},
		{
			severity: 'error',
			message: "Required 'height' on '<img>'",
			line: 1,
			col: 1,
			raw: '<img src="/path/to/image.png">',
			ruleId: 'required-attr',
		},
		{
			severity: 'error',
			message: "Required 'width' on '<img>'",
			line: 1,
			col: 1,
			raw: '<img src="/path/to/image.png">',
			ruleId: 'required-attr',
		},
	]);
});

test('"alt" attribute on "<area>" is required only if the href attribute is used', async () => {
	expect(
		(
			await mlTest(
				'<area href="path/to">',
				{
					rules: {
						'required-attr': true,
					},
					nodeRules: [],
				},
				[rule],
				'en',
			)
		).violations.length,
	).toBe(1);

	expect(
		(
			await mlTest(
				'<area href="path/to" alt="alternate text">',
				{
					rules: {
						'required-attr': true,
					},
					nodeRules: [],
				},
				[rule],
				'en',
			)
		).violations.length,
	).toBe(0);
});

test('At least one of data and type must be defined to <object>.', async () => {
	expect(
		(
			await mlTest(
				'<object data="https://example.com/data">',
				{
					rules: {
						'required-attr': true,
					},
					nodeRules: [],
				},
				[rule],
				'en',
			)
		).violations.length,
	).toBe(0);

	expect(
		(
			await mlTest(
				'<object type="XXXX_YYYY_ZZZZ">',
				{
					rules: {
						'required-attr': true,
					},
					nodeRules: [],
				},
				[rule],
				'en',
			)
		).violations.length,
	).toBe(0);

	expect(
		(
			await mlTest(
				'<object>',
				{
					rules: {
						'required-attr': true,
					},
					nodeRules: [],
				},
				[rule],
				'en',
			)
		).violations.length,
	).toBe(2);
});

test('The ancestors of the <source> element.', async () => {
	expect(
		(
			await mlTest(
				'<audio><source></audio>',
				{
					rules: {
						'required-attr': true,
					},
					nodeRules: [],
				},
				[rule],
				'en',
			)
		).violations,
	).toStrictEqual([
		{
			ruleId: 'required-attr',
			severity: 'error',
			line: 1,
			col: 8,
			message: "Required 'src' on '<source>'",
			raw: '<source>',
		},
	]);

	expect(
		(
			await mlTest(
				'<video><source></video>',
				{
					rules: {
						'required-attr': true,
					},
					nodeRules: [],
				},
				[rule],
				'en',
			)
		).violations,
	).toStrictEqual([
		{
			ruleId: 'required-attr',
			severity: 'error',
			line: 1,
			col: 8,
			message: "Required 'src' on '<source>'",
			raw: '<source>',
		},
	]);

	expect(
		(
			await mlTest(
				'<picture><source></picture>',
				{
					rules: {
						'required-attr': true,
					},
					nodeRules: [],
				},
				[rule],
				'en',
			)
		).violations,
	).toStrictEqual([]);
});

test('nodeRules', async () => {
	const { violations } = await mlTest(
		'<img src="path/to.svg" alt="text" />',
		{
			rules: {
				'required-attr': true,
			},
			nodeRules: [
				{
					selector: 'img[src$=.svg]',
					rules: {
						'required-attr': 'role',
					},
				},
			],
		},
		[rule],
		'en',
	);

	expect(violations).toStrictEqual([
		{
			ruleId: 'required-attr',
			severity: 'error',
			line: 1,
			col: 1,
			message: "Required 'role' on '<img>'",
			raw: '<img src="path/to.svg" alt="text" />',
		},
	]);
});

test('Foreign element', async () => {
	expect(
		(
			await mlTest(
				'<svg></svg>',
				{
					rules: {
						'required-attr': true,
					},
					nodeRules: [
						{
							tagName: 'svg',
							rules: {
								'required-attr': {
									severity: 'error',
									value: 'viewBox',
								},
							},
						},
					],
				},
				[rule],
				'en',
			)
		).violations,
	).toStrictEqual([
		{
			ruleId: 'required-attr',
			severity: 'error',
			line: 1,
			col: 1,
			message: "Required 'viewBox' on '<svg>'",
			raw: '<svg>',
		},
	]);
});

test('svg', async () => {
	expect(
		(
			await mlTest(
				`<svg>
					<circle cx="50" cy="50" r="40" />
					<circle cx="150" cy="50" r="4" />
					<circle cx="5" cy="5" r="4" />
					<circle />
				</svg>
				`,
				{
					rules: {
						'required-attr': true,
					},
					nodeRules: [
						{
							selector: 'circle',
							rules: {
								'required-attr': ['cx', 'cy', 'r'],
							},
						},
					],
				},
				[rule],
				'en',
			)
		).violations,
	).toStrictEqual([
		{
			ruleId: 'required-attr',
			severity: 'error',
			line: 5,
			col: 6,
			message: "Required 'cx' on '<circle>'",
			raw: '<circle />',
		},
		{
			ruleId: 'required-attr',
			severity: 'error',
			line: 5,
			col: 6,
			message: "Required 'cy' on '<circle>'",
			raw: '<circle />',
		},
		{
			ruleId: 'required-attr',
			severity: 'error',
			line: 5,
			col: 6,
			message: "Required 'r' on '<circle>'",
			raw: '<circle />',
		},
	]);
});

test('Pug', async () => {
	expect(
		(
			await mlTest(
				'img',
				{
					parser: {
						'.*': '@markuplint/pug-parser',
					},
					rules: {
						'required-attr': true,
					},
					nodeRules: [],
				},
				[rule],
				'en',
			)
		).violations,
	).toStrictEqual([
		{
			ruleId: 'required-attr',
			severity: 'error',
			line: 1,
			col: 1,
			message: "Required 'src' on '<img>'",
			raw: 'img',
		},
	]);
});

test('Vue', async () => {
	expect(
		(
			await mlTest(
				'<template><img :src="src"></template>',
				{
					parser: {
						'.*': '@markuplint/vue-parser',
					},
					rules: {
						'required-attr': true,
					},
					nodeRules: [],
				},
				[rule],
				'en',
			)
		).violations.length,
	).toBe(0);
});

test('React', async () => {
	expect(
		(
			await mlTest(
				'<img alt={alt} />',
				{
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					rules: {
						'required-attr': true,
					},
					nodeRules: [],
				},
				[rule],
				'en',
			)
		).violations,
	).toStrictEqual([
		{
			ruleId: 'required-attr',
			severity: 'error',
			line: 1,
			col: 1,
			message: "Required 'src' on '<img>'",
			raw: '<img alt={alt} />',
		},
	]);

	expect(
		(
			await mlTest(
				'<img {...props} />',
				{
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					rules: {
						'required-attr': true,
					},
					nodeRules: [],
				},
				[rule],
				'en',
			)
		).violations,
	).toStrictEqual([]);
});
