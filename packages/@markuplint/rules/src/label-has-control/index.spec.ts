import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('No control', async () => {
	const { violations } = await mlRuleTest(rule, '<label>foo</label>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			raw: '<label>',
			message: 'The "label" element should associate with a control',
		},
	]);
});

test('Not single control', async () => {
	const { violations } = await mlRuleTest(rule, '<label><input><select></select></label>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 15,
			raw: '<select>',
			message: 'The "label" element associates only first control',
		},
	]);
});
