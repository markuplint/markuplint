import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('id-duplication', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"><p id="a"></p></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The value of the "id" attribute is duplicated',
			line: 1,
			col: 16,
			raw: 'id="a"',
		},
	]);
});

test('id-duplication', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"></div>');
	expect(violations.length).toBe(0);
});

test('id-duplication', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"></div><div id="a"></div><div id="a"></div>');
	expect(violations.length).toBe(2);
});

test('id-duplication', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"></div><div id="b"></div><div id="c"></div>');
	expect(violations.length).toBe(0);
});

test('in Vue', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`<template>
	<div v-if="bool"><span :id="uuid"></span></div>
	<div v-else><span :id="uuid"></span></div>
</template>`,
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
		},
	);
	expect(violations.length).toBe(0);
});
