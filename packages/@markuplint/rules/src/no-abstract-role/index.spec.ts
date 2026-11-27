import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-abstract-role-001] concrete role', async () => {
	expect((await mlRuleTest(rule, '<div role="button"></div>')).violations).toStrictEqual([]);
});

test('[no-abstract-role-002] abstract role', async () => {
	expect((await mlRuleTest(rule, '<div role="roletype"></div>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 12,
			message: 'The "roletype" role is the abstract role',
			raw: 'roletype',
		},
	]);
});

test('[no-abstract-role-003] of two `role` attributes, the one that the element has is checked', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	// In JSX, the later `role` overwrites the first, so the abstract one is never the role
	expect((await mlRuleTest(rule, '<div role="widget" role="button" />', { parser })).violations).toStrictEqual([]);

	// In the HTML syntax, the first is kept and the second dropped
	expect((await mlRuleTest(rule, '<div role="widget" role="button"></div>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 12,
			message: 'The "widget" role is the abstract role',
			raw: 'widget',
		},
	]);
});
