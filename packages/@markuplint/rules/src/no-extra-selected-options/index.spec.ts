import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-extra-selected-options-valid-001] zero selected options', async () => {
	const { violations } = await mlRuleTest(rule, '<select><option>a</option><option>b</option></select>');
	expect(violations.length).toBe(0);
});

test('[no-extra-selected-options-valid-002] exactly one selected option', async () => {
	const { violations } = await mlRuleTest(rule, '<select><option selected>a</option><option>b</option></select>');
	expect(violations.length).toBe(0);
});

test('[no-extra-selected-options-valid-003] multiple selected with multiple attribute', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<select multiple><option selected>a</option><option selected>b</option></select>',
	);
	expect(violations.length).toBe(0);
});

test('[no-extra-selected-options-valid-004] selected options inside optgroup respected', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<select><optgroup label="g"><option selected>a</option><option>b</option></optgroup></select>',
	);
	expect(violations.length).toBe(0);
});

test('[no-extra-selected-options-invalid-001] two selected options without multiple', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<select><option selected>a</option><option selected>b</option></select>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 36,
			message:
				'The "select" element cannot have more than one selected "option" descendant unless the "multiple" attribute is specified',
			raw: '<option selected>',
		},
	]);
});

test('[no-extra-selected-options-invalid-002] selected spans select and optgroup descendants', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<select><option selected>a</option><optgroup label="g"><option selected>b</option></optgroup></select>',
	);
	expect(violations.length).toBe(1);
	expect(violations[0]?.line).toBe(1);
	expect(violations[0]?.col).toBe(56);
});

test('[no-extra-selected-options-invalid-003] three selected reports two excess', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<select><option selected>a</option><option selected>b</option><option selected>c</option></select>',
	);
	expect(violations.length).toBe(2);
	expect(violations.map(v => v.col)).toStrictEqual([36, 63]);
});
