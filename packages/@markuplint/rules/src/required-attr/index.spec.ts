import * as markuplint from 'markuplint';
import rule from './';

test('warns if specified attribute is not appeared', async () => {
	const r = await markuplint.verify(
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

	expect(r).toStrictEqual([
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
	const r = await markuplint.verify(
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

	expect(r).toStrictEqual([
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
			await markuplint.verify(
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
		).length,
	).toBe(1);

	expect(
		(
			await markuplint.verify(
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
		).length,
	).toBe(0);
});

test('At least one of data and type must be defined to <object>.', async () => {
	expect(
		(
			await markuplint.verify(
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
		).length,
	).toBe(0);

	expect(
		(
			await markuplint.verify(
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
		).length,
	).toBe(0);

	expect(
		(
			await markuplint.verify(
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
		).length,
	).toBe(2);
});

test('Pug', async () => {
	expect(
		await markuplint.verify(
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
		),
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
			await markuplint.verify(
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
		).length,
	).toBe(0);
});
