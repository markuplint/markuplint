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
