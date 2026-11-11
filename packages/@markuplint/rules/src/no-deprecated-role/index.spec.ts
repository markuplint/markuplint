import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-deprecated-role-valid-001] non-deprecated role', async () => {
	expect((await mlRuleTest(rule, '<div role="button"></div>')).violations).toStrictEqual([]);
});

test('[no-deprecated-role-invalid-001] deprecated role', async () => {
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

test('[no-deprecated-role-invalid-002] deprecated DPUB-ARIA role', async () => {
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
