import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[require-parent-role-valid-001] correct parent context', async () => {
	expect((await mlRuleTest(rule, '<div role="listbox"><div role="option"></div></div>')).violations).toStrictEqual(
		[],
	);
});

test('[require-parent-role-valid-002] no role attr', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});
