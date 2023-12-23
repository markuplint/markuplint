import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('It is test', async () => {
	const { violations } = await mlRuleTest(rule, '<x-foo></x-foo>');
	expect(violations.length).toBe(1);
	// expect(violations).toStrictEqual([
	// 	{
	// 		severity: 'error',
	// 		line: 1,
	// 		col: 1,
	// 		raw: '',
	// 		message: 'It is issue',
	// 	},
	// ]);
});
