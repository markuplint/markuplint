import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('_blank', async () => {
	expect((await mlRuleTest(rule, '<a href="path/to" target="_blank"></a>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<a href="path/to" target="blank"></a>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 27,
			message: 'Don\'t use a ambiguous navigable target name. Did you mean "_blank"?',
			raw: 'blank',
		},
	]);
});

test('_self', async () => {
	expect((await mlRuleTest(rule, '<a href="path/to" target="_self"></a>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<a href="path/to" target="self"></a>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 27,
			message: 'Don\'t use a ambiguous navigable target name. Did you mean "_self"?',
			raw: 'self',
		},
	]);
});

test('_parent', async () => {
	expect((await mlRuleTest(rule, '<a href="path/to" target="_parent"></a>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<a href="path/to" target="parent"></a>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 27,
			message: 'Don\'t use a ambiguous navigable target name. Did you mean "_parent"?',
			raw: 'parent',
		},
	]);
});

test('_top', async () => {
	expect((await mlRuleTest(rule, '<iframe src="path/to" name="_top"></iframe>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<iframe src="path/to" name="top"></iframe>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 29,
			message: "Don't use a ambiguous navigable target name",
			raw: 'top',
		},
	]);
});

test('_foo (invalid keyword)', async () => {
	expect((await mlRuleTest(rule, '<a href="path/to" target="_foo"></a>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<a href="path/to" target="foo"></a>')).violations.length).toBe(0);
});
