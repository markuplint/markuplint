import rule from './';
import { testAsyncAndSyncVerify } from '../test-utils';

test('warns if specified attribute is not appeared', async () => {
	await testAsyncAndSyncVerify(
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
		[
			{
				col: 1,
				line: 1,
				message: "Required 'alt' on '<img>'",
				raw: '<img src="/path/to/image.png">',
				ruleId: 'required-attr',
				severity: 'error',
			},
		],
	);
});

test('multiple required attributes', async () => {
	await testAsyncAndSyncVerify(
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
		[
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
		],
	);
});

test('"alt" attribute on "<area>" is required only if the href attribute is used', async () => {
	await testAsyncAndSyncVerify(
		'<area href="path/to">',
		{
			rules: {
				'required-attr': true,
			},
			nodeRules: [],
		},
		[rule],
		'en',
		1,
		r => r.length,
	);

	await testAsyncAndSyncVerify(
		'<area href="path/to" alt="alternate text">',
		{
			rules: {
				'required-attr': true,
			},
			nodeRules: [],
		},
		[rule],
		'en',
	);
});

test('At least one of data and type must be defined to <object>.', async () => {
	await testAsyncAndSyncVerify(
		'<object data="https://example.com/data">',
		{
			rules: {
				'required-attr': true,
			},
			nodeRules: [],
		},
		[rule],
		'en',
	);

	await testAsyncAndSyncVerify(
		'<object type="XXXX_YYYY_ZZZZ">',
		{
			rules: {
				'required-attr': true,
			},
			nodeRules: [],
		},
		[rule],
		'en',
	);

	await testAsyncAndSyncVerify(
		'<object>',
		{
			rules: {
				'required-attr': true,
			},
			nodeRules: [],
		},
		[rule],
		'en',
		2,
		r => r.length,
	);
});

test('The ancestors of the <source> element.', async () => {
	await testAsyncAndSyncVerify(
		'<audio><source></audio>',
		{
			rules: {
				'required-attr': true,
			},
			nodeRules: [],
		},
		[rule],
		'en',
		[
			{
				ruleId: 'required-attr',
				severity: 'error',
				line: 1,
				col: 8,
				message: "Required 'src' on '<source>'",
				raw: '<source>',
			},
		],
	);

	await testAsyncAndSyncVerify(
		'<video><source></video>',
		{
			rules: {
				'required-attr': true,
			},
			nodeRules: [],
		},
		[rule],
		'en',
		[
			{
				ruleId: 'required-attr',
				severity: 'error',
				line: 1,
				col: 8,
				message: "Required 'src' on '<source>'",
				raw: '<source>',
			},
		],
	);

	await testAsyncAndSyncVerify(
		'<picture><source></picture>',
		{
			rules: {
				'required-attr': true,
			},
			nodeRules: [],
		},
		[rule],
		'en',
	);
});

test('Foreign element', async () => {
	await testAsyncAndSyncVerify(
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
		[
			{
				ruleId: 'required-attr',
				severity: 'error',
				line: 1,
				col: 1,
				message: "Required 'viewBox' on '<svg>'",
				raw: '<svg>',
			},
		],
	);
});

test('Pug', async () => {
	await testAsyncAndSyncVerify(
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
		[
			{
				ruleId: 'required-attr',
				severity: 'error',
				line: 1,
				col: 1,
				message: "Required 'src' on '<img>'",
				raw: 'img',
			},
		],
	);
});

test('Vue', async () => {
	await testAsyncAndSyncVerify(
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
	);
});
