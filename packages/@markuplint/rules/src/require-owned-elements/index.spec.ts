import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[require-owned-elements-valid-001] list with listitem', async () => {
	expect((await mlRuleTest(rule, '<div role="list"><div role="listitem">item</div></div>')).violations).toStrictEqual(
		[],
	);
});

test('[require-owned-elements-valid-002] no role', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});

test('[require-owned-elements-invalid-001] list without listitem', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="list"><div>not a listitem</div></div>');
	expect(violations.length).toBe(1);
	expect(violations[0]!.severity).toBe('error');
});

// #3589: empty containers warn with busy suggestion (not error)
test('[require-owned-elements-issue-3589-001] empty ul warns with busy suggestion', async () => {
	const { violations } = await mlRuleTest(rule, '<ul></ul>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The child element requires the "listitem" role. Or, require aria-busy="true"',
			raw: '<ul>',
		},
	]);
});

test('[require-owned-elements-issue-3589-002] empty div[role=list] warns with busy suggestion', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="list"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The child element requires the "listitem" role. Or, require aria-busy="true"',
			raw: '<div role="list">',
		},
	]);
});

test('[require-owned-elements-issue-3589-003] empty menu warns with busy suggestion', async () => {
	const { violations } = await mlRuleTest(rule, '<menu></menu>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The child element requires the "listitem" role. Or, require aria-busy="true"',
			raw: '<menu>',
		},
	]);
});

test('[require-owned-elements-issue-3589-004] ul with aria-busy="true" is valid', async () => {
	expect((await mlRuleTest(rule, '<ul aria-busy="true"></ul>')).violations).toStrictEqual([]);
});
