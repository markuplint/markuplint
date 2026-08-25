import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-abstract-role-valid-001] concrete role', async () => {
	expect((await mlRuleTest(rule, '<div role="button"></div>')).violations).toStrictEqual([]);
});

test('[no-abstract-role-invalid-001] abstract role', async () => {
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
