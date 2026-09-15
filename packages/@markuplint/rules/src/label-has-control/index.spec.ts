import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[label-has-control-invalid-001] No control', async () => {
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

test('[label-has-control-valid-001] A single control is associated', async () => {
	const { violations } = await mlRuleTest(rule, '<label><input></label>');
	expect(violations).toStrictEqual([]);
});

test('[label-has-control-valid-002] Multiple controls are still associated (excess controls are label-no-multiple-controls’s responsibility)', async () => {
	const { violations } = await mlRuleTest(rule, '<label><input><select></select></label>');
	expect(violations).toStrictEqual([]);
});

test('[label-has-control-valid-003] The `for` attribute counts as an association even without descendants', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="x">foo</label><input id="x">');
	expect(violations).toStrictEqual([]);
});

test('[label-has-control-valid-004] The `as` attribute makes descendants known, and a single control is associated', async () => {
	const { violations } = await mlRuleTest(rule, '<x-label as="label"><input></x-label>');
	expect(violations).toStrictEqual([]);
});

describe('issues', () => {
	test('[label-has-control-issue-2392] #2392', async () => {
		const { violations } = await mlRuleTest(rule, '<Component></Component>', {
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			pretenders: [
				{
					selector: 'Component',
					as: {
						element: 'label',
						inheritAttrs: true,
					},
				},
			],
		});
		expect(violations).toStrictEqual([]);
	});
});
