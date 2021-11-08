import { mlTest } from 'markuplint';
import rule from './';

test('id-duplication', async () => {
	const { violations } = await mlTest(
		'<div id="a"><p id="a"></p></div>',
		{
			rules: {
				'id-duplication': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The value of the "id" attribute is duplicated',
			line: 1,
			col: 16,
			raw: 'id="a"',
			ruleId: 'id-duplication',
		},
	]);
});

test('id-duplication', async () => {
	const { violations } = await mlTest(
		'<div id="a"></div>',
		{
			rules: {
				'id-duplication': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations.length).toBe(0);
});

test('id-duplication', async () => {
	const { violations } = await mlTest(
		'<div id="a"></div><div id="a"></div><div id="a"></div>',
		{
			rules: {
				'id-duplication': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations.length).toBe(2);
});

test('id-duplication', async () => {
	const { violations } = await mlTest(
		'<div id="a"></div><div id="b"></div><div id="c"></div>',
		{
			rules: {
				'id-duplication': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations.length).toBe(0);
});

test('in Vue', async () => {
	const { violations } = await mlTest(
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
	expect(violations.length).toBe(0);
});
