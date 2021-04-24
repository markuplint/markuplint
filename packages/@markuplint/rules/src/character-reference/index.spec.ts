import rule from './';
import { testAsyncAndSyncVerify } from '../test-utils';

test('character-reference', async () => {
	await testAsyncAndSyncVerify(
		'<div id="a"> > < & " \' &amp;</div>',
		{
			rules: {
				'character-reference': true,
			},
		},
		[rule],
		'en',
		[
			{
				col: 14,
				line: 1,
				message: 'Illegal characters must escape in character reference',
				raw: '>',
				ruleId: 'character-reference',
				severity: 'error',
			},
			{
				col: 16,
				line: 1,
				message: 'Illegal characters must escape in character reference',
				raw: '<',
				ruleId: 'character-reference',
				severity: 'error',
			},
			{
				col: 18,
				line: 1,
				message: 'Illegal characters must escape in character reference',
				raw: '&',
				ruleId: 'character-reference',
				severity: 'error',
			},
			{
				col: 20,
				line: 1,
				message: 'Illegal characters must escape in character reference',
				raw: '"',
				ruleId: 'character-reference',
				severity: 'error',
			},
		],
	);
});

test('character-reference', async () => {
	await testAsyncAndSyncVerify(
		'<img src="path/to?a=b&c=d">',
		{
			rules: {
				'character-reference': true,
			},
		},
		[rule],
		'en',
		[
			{
				severity: 'error',
				message: 'Illegal characters must escape in character reference',
				line: 1,
				col: 22,
				raw: '&',
				ruleId: 'character-reference',
			},
		],
	);
});

test('character-reference', async () => {
	await testAsyncAndSyncVerify(
		'<script>if (i < 0) console.log("<markuplint>");</script>',
		{
			rules: {
				'character-reference': true,
			},
		},
		[rule],
		'en',
	);
});

test('in Vue', async () => {
	await testAsyncAndSyncVerify(
		'<template><div v-if="a < b"></div></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			rules: {
				'character-reference': true,
			},
		},
		[rule],
		'en',
	);
});
