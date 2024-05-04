import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('Consecutive', async () => {
	const { violations } = await mlRuleTest(rule, '<p>A<br data-first> <br data-second>B</p>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 21,
			raw: '<br data-second>',
			message: 'Consecutive "br" elements detected',
		},
	]);
});

test('No consecutive', async () => {
	const { violations } = await mlRuleTest(rule, '<p>A<br data-first>B<br data-second>C</p>');
	expect(violations.length).toBe(0);
});
