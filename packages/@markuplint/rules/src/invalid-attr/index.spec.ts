import { floatCheck, intCheck, nonZeroUintCheck, uintCheck } from './type-check';
import rule from './';
import { testAsyncAndSyncVerify } from '../test-utils';

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
	await testAsyncAndSyncVerify(
		'<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
		[
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
		],
	);
});

test('disable', async () => {
	await testAsyncAndSyncVerify(
		'<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>',
		{
			rules: {
				'invalid-attr': false,
			},
		},
		[rule],
		'en',
	);
});

test('ancestor condition', async () => {
	await testAsyncAndSyncVerify(
		'<picture><source media="print"></picture>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	await testAsyncAndSyncVerify(
		'<audio><source media="print"></audio>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
		[
			{
				ruleId: 'invalid-attr',
				severity: 'error',
				line: 1,
				col: 16,
				message: 'The "media" attribute is not allowed',
				raw: 'media',
			},
		],
	);
});

test('custom rule', async () => {
	await testAsyncAndSyncVerify(
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
		[
			{
				ruleId: 'invalid-attr',
				severity: 'error',
				line: 1,
				col: 15,
				message: 'The "x-attr" attribute expect custom pattern "/[a-z]+/"',
				raw: '123',
			},
		],
	);
});

test('custom rule: type', async () => {
	await testAsyncAndSyncVerify(
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
		[
			{
				ruleId: 'invalid-attr',
				severity: 'error',
				line: 1,
				col: 41,
				message: 'The "x-attr" attribute expect integer',
				raw: 'abc',
			},
		],
	);
});

test('custom element', async () => {
	await testAsyncAndSyncVerify(
		'<custom-element any-attr></custom-element>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
});

test('custom element and custom rule', async () => {
	await testAsyncAndSyncVerify(
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
		1,
		r => r.length,
	);
});

test('prefix attribute', async () => {
	await testAsyncAndSyncVerify(
		'<div v-bind:title="title" :class="classes" @click="click"></div>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
		[
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
		],
	);
});

test('ignore prefix attribute', async () => {
	await testAsyncAndSyncVerify(
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
});

test('URL attribute', async () => {
	await testAsyncAndSyncVerify(
		'<img src="https://sample.com/path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	await testAsyncAndSyncVerify(
		'<img src="//sample.com/path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	await testAsyncAndSyncVerify(
		'<img src="//user:pass@sample.com/path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	await testAsyncAndSyncVerify(
		'<img src="/path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	await testAsyncAndSyncVerify(
		'<img src="/path/to?param=value">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	await testAsyncAndSyncVerify(
		'<img src="/?param=value">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	await testAsyncAndSyncVerify(
		'<img src="?param=value">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	await testAsyncAndSyncVerify(
		'<img src="path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	await testAsyncAndSyncVerify(
		'<img src="./path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	await testAsyncAndSyncVerify(
		'<img src="../path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	await testAsyncAndSyncVerify(
		'<img src="/path/to#hash">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	await testAsyncAndSyncVerify(
		'<img src="#hash">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
});

test('Foreign element', async () => {
	await testAsyncAndSyncVerify(
		'<div><svg width="10px" height="10px" viewBox="0 0 10 10"></svg></div>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
});

test('Pug', async () => {
	await testAsyncAndSyncVerify(
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
});

test('Vue', async () => {
	await testAsyncAndSyncVerify(
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
		1,
		r => r.length,
	);
	await testAsyncAndSyncVerify(
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
});

test('Vue iterator', async () => {
	await testAsyncAndSyncVerify(
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
		1,
		r => r.length,
	);
	await testAsyncAndSyncVerify(
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
});
