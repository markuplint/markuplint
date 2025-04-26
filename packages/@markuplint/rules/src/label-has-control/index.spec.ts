import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

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

test('The `as` attribute', async () => {
	expect((await mlRuleTest(rule, '<x-label as="label"><input><select></select></x-label>')).violations).toStrictEqual(
		[
			{
				severity: 'warning',
				line: 1,
				col: 28,
				raw: '<select>',
				message: 'The "label" element associates only first control',
			},
		],
	);
	expect((await mlRuleTest(rule, '<x-label as="label"><input></x-label>')).violations).toStrictEqual([]);
});

describe('issues', () => {
	test('#2392', async () => {
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
