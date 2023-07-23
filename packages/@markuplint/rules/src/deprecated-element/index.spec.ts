import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('normal', async () => {
	const { violations } = await mlRuleTest(rule, '<div></div><p><span></span></p>');
	expect(violations).toStrictEqual([]);
});

test('deprecated', async () => {
	const { violations } = await mlRuleTest(rule, '<font></font><big><blink></blink></big>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "font" element is obsolete',
			line: 1,
			col: 1,
			raw: '<font>',
		},
		{
			severity: 'error',
			message: 'The "big" element is obsolete',
			line: 1,
			col: 14,
			raw: '<big>',
		},
		{
			severity: 'error',
			message: 'The "blink" element is obsolete',
			line: 1,
			col: 19,
			raw: '<blink>',
		},
	]);
});
