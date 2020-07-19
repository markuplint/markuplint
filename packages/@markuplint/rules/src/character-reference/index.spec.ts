import rule from './';
import { verify } from '../helpers';

test('character-reference', async () => {
	const r = await verify(
		'<div id="a"> > < & " \' &amp;</div>',
		{
			rules: {
				'character-reference': true,
			},
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(4);
	expect(r[0]).toStrictEqual({
		severity: 'error',
		message: 'Illegal characters must escape in character reference',
		line: 1,
		col: 14,
		raw: '>',
		ruleId: 'character-reference',
	});
	expect(r[1].col).toBe(16);
	expect(r[1].raw).toBe('<');
	expect(r[2].col).toBe(18);
	expect(r[2].raw).toBe('&');
	expect(r[3].col).toBe(20);
	expect(r[3].raw).toBe('"');
});

test('character-reference', async () => {
	const r = await verify(
		'<img src="path/to?a=b&c=d">',
		{
			rules: {
				'character-reference': true,
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
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
	const r = await verify(
		'<script>if (i < 0) console.log("<markuplint>");</script>',
		{
			rules: {
				'character-reference': true,
			},
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(0);
});

test('in Vue', async () => {
	const r = await verify(
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
	expect(r.length).toBe(0);
});
