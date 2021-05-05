import * as markuplint from 'markuplint';
import { floatCheck, intCheck, nonZeroUintCheck, uintCheck } from './type-check';
import rule from './';

test('intCheck', () => {
	expect(intCheck('0')).toBe(true);
	expect(intCheck('1')).toBe(true);
	expect(intCheck('-0')).toBe(true);
	expect(intCheck('-1')).toBe(true);
	expect(intCheck('10')).toBe(true);
	expect(intCheck('100')).toBe(true);
	expect(intCheck('1.00')).toBe(false);
	expect(intCheck('.001')).toBe(false);
	expect(intCheck(' 1 ')).toBe(false);
	expect(intCheck('- 1')).toBe(false);
});

test('uintCheck', () => {
	expect(uintCheck('0')).toBe(true);
	expect(uintCheck('1')).toBe(true);
	expect(uintCheck('10')).toBe(true);
	expect(uintCheck('100')).toBe(true);
	expect(uintCheck('-0')).toBe(false);
	expect(uintCheck('-1')).toBe(false);
	expect(uintCheck('1.00')).toBe(false);
	expect(uintCheck('.001')).toBe(false);
	expect(uintCheck(' 1 ')).toBe(false);
	expect(uintCheck('- 1')).toBe(false);
});

test('floatCheck', () => {
	expect(floatCheck('0')).toBe(true);
	expect(floatCheck('1')).toBe(true);
	expect(floatCheck('10')).toBe(true);
	expect(floatCheck('100')).toBe(true);
	expect(floatCheck('-0')).toBe(true);
	expect(floatCheck('-1')).toBe(true);
	expect(floatCheck('1.00')).toBe(true);
	expect(floatCheck('.001')).toBe(true);
	expect(floatCheck(' 1 ')).toBe(false);
	expect(floatCheck('- 1')).toBe(false);
});

test('nonZeroUintCheck', () => {
	expect(nonZeroUintCheck('0')).toBe(false);
	expect(nonZeroUintCheck('1')).toBe(true);
	expect(nonZeroUintCheck('10')).toBe(true);
	expect(nonZeroUintCheck('100')).toBe(true);
	expect(nonZeroUintCheck('-0')).toBe(false);
	expect(nonZeroUintCheck('-1')).toBe(false);
	expect(nonZeroUintCheck('1.00')).toBe(false);
	expect(nonZeroUintCheck('.001')).toBe(false);
	expect(nonZeroUintCheck(' 1 ')).toBe(false);
	expect(nonZeroUintCheck('- 1')).toBe(false);
});

test('warns if specified attribute value is invalid', async () => {
	const r = await markuplint.verify(
		'<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 4,
			message: 'The "invalid-attr" attribute is not allowed',
			raw: 'invalid-attr',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 33,
			message:
				'The "referrerpolicy" attribute expect either "", "no-referrer", "no-referrer-when-downgrade", "same-origin", "origin", "strict-origin", "origin-when-cross-origin", "strict-origin-when-cross-origin", "unsafe-url"',
			raw: 'invalid-value',
		},
	]);
});

test('Type check', async () => {
	const r = await markuplint.verify(
		'<form name=""></form>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 13,
			message: 'The "name" attribute value must not be the empty string',
			raw: '',
		},
	]);
});

test('disable', async () => {
	const r = await markuplint.verify(
		'<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>',
		{
			rules: {
				'invalid-attr': false,
			},
		},
		[rule],
		'en',
	);

	expect(r.length).toBe(0);
});

test('ancestor condition', async () => {
	expect(
		await markuplint.verify(
			'<picture><source media="print"></picture>',
			{
				rules: {
					'invalid-attr': true,
				},
			},
			[rule],
			'en',
		),
	).toStrictEqual([]);

	expect(
		await markuplint.verify(
			'<audio><source media="print"></audio>',
			{
				rules: {
					'invalid-attr': true,
				},
			},
			[rule],
			'en',
		),
	).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 16,
			message: 'The "media" attribute is not allowed',
			raw: 'media',
		},
	]);
});

test('custom rule', async () => {
	const r = await markuplint.verify(
		'<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>',
		{
			rules: {
				'invalid-attr': {
					option: {
						attrs: {
							'x-attr': {
								pattern: '/[a-z]+/',
							},
						},
					},
				},
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 15,
			message: 'The "x-attr" attribute expect custom pattern "/[a-z]+/"',
			raw: '123',
		},
	]);
});

test('custom rule: type', async () => {
	const r = await markuplint.verify(
		'<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>',
		{
			rules: {
				'invalid-attr': {
					option: {
						attrs: {
							'x-attr': {
								type: 'Int',
							},
						},
					},
				},
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 41,
			message: 'The "x-attr" attribute expect integer',
			raw: 'abc',
		},
	]);
});

test('custom element', async () => {
	const r = await markuplint.verify(
		'<custom-element any-attr></custom-element>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(r.length).toBe(0);
});

test('custom element and custom rule', async () => {
	const r = await markuplint.verify(
		'<custom-element any-attr="any-string"></custom-element>',
		{
			rules: {
				'invalid-attr': true,
			},
			nodeRules: [
				{
					tagName: 'custom-element',
					rules: {
						'invalid-attr': {
							option: {
								attrs: {
									'any-attr': {
										type: 'Int',
									},
								},
							},
						},
					},
				},
			],
		},
		[rule],
		'en',
	);

	expect(r.length).toBe(1);
});

test('prefix attribute', async () => {
	const r = await markuplint.verify(
		'<div v-bind:title="title" :class="classes" @click="click"></div>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "v-bind:title" attribute is not allowed',
			raw: 'v-bind:title',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 27,
			message: 'The ":class" attribute is not allowed',
			raw: ':class',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			col: 44,
			line: 1,
			message: 'The "@click" attribute is not allowed',
			raw: '@click',
		},
	]);
});

test('ignore prefix attribute', async () => {
	const r = await markuplint.verify(
		'<div v-bind:title="title" :class="classes" @click="click"></div>',
		{
			rules: {
				'invalid-attr': {
					option: {
						ignoreAttrNamePrefix: ['v-bind:', ':', '@'],
					},
				},
			},
		},
		[rule],
		'en',
	);

	expect(r.length).toBe(0);
});

test('URL attribute', async () => {
	const r = await markuplint.verify(
		'<img src="https://sample.com/path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(0);

	const r2 = await markuplint.verify(
		'<img src="//sample.com/path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(r2.length).toBe(0);

	const r3 = await markuplint.verify(
		'<img src="//user:pass@sample.com/path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(r3.length).toBe(0);

	const r4 = await markuplint.verify(
		'<img src="/path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(r4.length).toBe(0);

	const r5 = await markuplint.verify(
		'<img src="/path/to?param=value">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(r5.length).toBe(0);

	const r6 = await markuplint.verify(
		'<img src="/?param=value">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(r6.length).toBe(0);

	const r7 = await markuplint.verify(
		'<img src="?param=value">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(r7.length).toBe(0);

	const r8 = await markuplint.verify(
		'<img src="path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(r8.length).toBe(0);

	const r9 = await markuplint.verify(
		'<img src="./path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(r9.length).toBe(0);

	const r10 = await markuplint.verify(
		'<img src="../path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(r10.length).toBe(0);

	const r11 = await markuplint.verify(
		'<img src="/path/to#hash">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(r11.length).toBe(0);

	const r12 = await markuplint.verify(
		'<img src="#hash">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(r12.length).toBe(0);
});

test('Foreign element', async () => {
	const r = await markuplint.verify(
		'<div><svg width="10px" height="10px" viewBox="0 0 10 10"></svg></div>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(r.length).toBe(0);
});

test('Pug', async () => {
	const r = await markuplint.verify(
		'button(type=buttonType)',
		{
			parser: {
				'.*': '@markuplint/pug-parser',
			},
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(r.length).toBe(0);
});

test('Vue', async () => {
	const r1 = await markuplint.verify(
		'<template><button type="buttonType"></button></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	const r2 = await markuplint.verify(
		'<template><button :type="buttonType"></button></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(r1.length).toBe(1);
	expect(r2.length).toBe(0);
});

test('Vue iterator', async () => {
	const r1 = await markuplint.verify(
		'<template><ul ref="ul"><li key="key"></li></ul></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: ['@markuplint/vue-spec'],
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	const r2 = await markuplint.verify(
		'<template><ul><li v-for="item of list" :key="key"></li></ul></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(r1.length).toBe(1);
	expect(r2.length).toBe(0);
});

test('React Component', async () => {
	const r = await markuplint.verify(
		'<Component className="foo" tabIndex="-1" tabindex="-1" aria-label="accname" htmlFor="bar" />',
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 42,
			message: 'The "tabindex" attribute is not allowed. Did you mean "tabIndex"?',
			raw: 'tabindex',
		},
	]);
});

test('React HTML', async () => {
	const r = await markuplint.verify(
		'<img className="foo" tabIndex="-1" tabindex="-1" aria-label="accname" htmlFor="bar" />',
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 36,
			message: 'The "tabindex" attribute is not allowed. Did you mean "tabIndex"?',
			raw: 'tabindex',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 71,
			message: 'The "for" attribute is not allowed',
			raw: 'htmlFor',
		},
	]);
});

test('React', async () => {
	const r = await markuplint.verify(
		'<a href={href} target={target} invalidAttr={invalidAttr} />',
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 32,
			message: 'The "invalidAttr" attribute is not allowed',
			raw: 'invalidAttr',
		},
	]);
});

test('React with spread attribute', async () => {
	expect(
		await markuplint.verify(
			'<a target="_blank" />',
			{
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				rules: {
					'invalid-attr': true,
				},
			},
			[rule],
			'en',
		),
	).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 4,
			message: 'The "target" attribute is not allowed',
			raw: 'target',
		},
	]);

	expect(
		await markuplint.verify(
			'<a {...props} target="_blank" />',
			{
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				rules: {
					'invalid-attr': true,
				},
			},
			[rule],
			'en',
		),
	).toStrictEqual([]);

	expect(
		await markuplint.verify(
			'<img invalid />',
			{
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				rules: {
					'invalid-attr': true,
				},
			},
			[rule],
			'en',
		),
	).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "invalid" attribute is not allowed',
			raw: 'invalid',
		},
	]);

	expect(
		await markuplint.verify(
			'<img {...props} invalid />',
			{
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
				rules: {
					'invalid-attr': true,
				},
			},
			[rule],
			'en',
		),
	).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 17,
			message: 'The "invalid" attribute is not allowed',
			raw: 'invalid',
		},
	]);
});
