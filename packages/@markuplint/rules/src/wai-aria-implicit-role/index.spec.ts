import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[wai-aria-implicit-role-valid-001] different from implicit role', async () => {
	expect((await mlRuleTest(rule, '<nav role="menu"></nav>')).violations).toStrictEqual([]);
});

test('[wai-aria-implicit-role-invalid-001] same as implicit role', async () => {
	expect((await mlRuleTest(rule, '<nav role="navigation"></nav>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 12,
			message: 'The "navigation" role is the implicit role of the "nav" element',
			raw: 'navigation',
		},
	]);
});
