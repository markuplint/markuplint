import rule from './';
import { testAsyncAndSyncVerify } from '../test-utils';

test('id-duplication', async () => {
	await testAsyncAndSyncVerify(
		'<div id="a"><p id="a"></p></div>',
		{
			rules: {
				'id-duplication': true,
			},
		},
		[rule],
		'en',
		[
			{
				severity: 'error',
				message: 'Duplicate attribute id value',
				line: 1,
				col: 16,
				raw: 'id="a"',
				ruleId: 'id-duplication',
			},
		],
	);
});

test('id-duplication', async () => {
	await testAsyncAndSyncVerify(
		'<div id="a"></div>',
		{
			rules: {
				'id-duplication': true,
			},
		},
		[rule],
		'en',
	);
});

test('id-duplication', async () => {
	await testAsyncAndSyncVerify(
		'<div id="a"></div><div id="a"></div><div id="a"></div>',
		{
			rules: {
				'id-duplication': true,
			},
		},
		[rule],
		'en',
		2,
		r => r.length,
	);
});

test('id-duplication', async () => {
	await testAsyncAndSyncVerify(
		'<div id="a"></div><div id="b"></div><div id="c"></div>',
		{
			rules: {
				'id-duplication': true,
			},
		},
		[rule],
		'en',
	);
});

test('in Vue', async () => {
	await testAsyncAndSyncVerify(
		`<template>
	<div v-if="bool"><span :id="uuid"></span></div>
	<div v-else><span :id="uuid"></span></div>
</template>`,
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			rules: {
				'id-duplication': true,
			},
		},
		[rule],
		'en',
	);
});
