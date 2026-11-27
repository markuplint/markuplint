import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-deprecated-role-001] non-deprecated role', async () => {
	expect((await mlRuleTest(rule, '<div role="button"></div>')).violations).toStrictEqual([]);
});

test('[no-deprecated-role-002] deprecated role', async () => {
	expect((await mlRuleTest(rule, '<div role="directory"></div>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			message: 'The "directory" role is deprecated',
			raw: 'role="directory"',
		},
	]);
});

test('[no-deprecated-role-003] deprecated DPUB-ARIA role', async () => {
	expect((await mlRuleTest(rule, '<div role="doc-biblioentry"></div>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			message: 'The "doc-biblioentry" role is deprecated',
			raw: 'role="doc-biblioentry"',
		},
	]);
});

test('[no-deprecated-role-004] of two `role` attributes, the one that the element has is checked', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<div role="button" role="directory" />', { parser })).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 20,
			message: 'The "directory" role is deprecated',
			raw: 'role="directory"',
		},
	]);
	expect((await mlRuleTest(rule, '<div role="directory" role="button" />', { parser })).violations).toStrictEqual([]);
	// The first in the HTML syntax
	expect((await mlRuleTest(rule, '<div role="directory" role="button"></div>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			message: 'The "directory" role is deprecated',
			raw: 'role="directory"',
		},
	]);
});
