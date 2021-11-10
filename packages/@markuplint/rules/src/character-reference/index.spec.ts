import { mlTest } from 'markuplint';

import rule from './';

test('character-reference', async () => {
	const { violations } = await mlTest(
		'<div id="a"> > < & " \' &amp;</div>',
		{
			rules: {
				'character-reference': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations.length).toBe(4);
	expect(violations[0]).toStrictEqual({
		severity: 'error',
		message: 'Illegal characters must escape in character reference',
		line: 1,
		col: 14,
		raw: '>',
		ruleId: 'character-reference',
	});
	expect(violations[1].col).toBe(16);
	expect(violations[1].raw).toBe('<');
	expect(violations[2].col).toBe(18);
	expect(violations[2].raw).toBe('&');
	expect(violations[3].col).toBe(20);
	expect(violations[3].raw).toBe('"');
});

test('character-reference', async () => {
	const { violations } = await mlTest(
		'<img src="path/to?a=b&c=d">',
		{
			rules: {
				'character-reference': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'Illegal characters must escape in character reference',
			line: 1,
			col: 22,
			raw: '&',
			ruleId: 'character-reference',
		},
	]);
});

test('character-reference', async () => {
	const { violations } = await mlTest(
		'<script>if (i < 0) console.log("<markuplint>");</script>',
		{
			rules: {
				'character-reference': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations.length).toBe(0);
});

test('in Vue', async () => {
	const { violations } = await mlTest(
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
	expect(violations.length).toBe(0);
});

test('in EJS', async () => {
	const { violations } = await mlTest(
		'<title><%- "title" _%></title>',
		{
			parser: {
				'.*': '@markuplint/ejs-parser',
			},
			rules: {
				'character-reference': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations.length).toBe(0);
});
