import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-default-aria-value-001] no aria props', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});

test('[no-default-aria-value-002] non-default value', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[no-default-aria-value-003] the lower-case spelling is reported (baseline of the upper-case one)', async () => {
	const { violations } = await mlRuleTest(rule, '<div aria-expanded="undefined"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			message: 'It is default value',
			raw: 'aria-expanded="undefined"',
		},
	]);
});

test('[no-default-aria-value-004] an upper-case aria-* is reported like the lower-case one', async () => {
	const { violations } = await mlRuleTest(rule, '<div ARIA-EXPANDED="undefined"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			message: 'It is default value',
			raw: 'ARIA-EXPANDED="undefined"',
		},
	]);
});

test('[no-default-aria-value-005] JSX: an upper-case aria-* on an HTML element is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div ARIA-EXPANDED="undefined" />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			message: 'It is default value',
			raw: 'ARIA-EXPANDED="undefined"',
		},
	]);
});

test('[no-default-aria-value-006] JSX: an upper-case aria-* on an svg element is not an ARIA attribute', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<svg ARIA-EXPANDED="undefined" />', { parser })).violations).toStrictEqual([]);

	// Control: the lower-case name is reported on the same element
	const { violations } = await mlRuleTest(rule, '<svg aria-expanded="undefined" />', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			message: 'It is default value',
			raw: 'aria-expanded="undefined"',
		},
	]);
});

test('[no-default-aria-value-007] a value with white space around it is not the keyword, ASCII or U+00A0', async () => {
	expect((await mlRuleTest(rule, '<div aria-expanded=" undefined\n"></div>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div aria-expanded="undefined\u00A0"></div>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<div aria-expanded="\u00A0undefined"></div>')).violations).toStrictEqual([]);
});

test.each([
	'<div role="alert" aria-live="off">a</div>',
	'<div role="status" aria-live="off">b</div>',
	'<div role="log" aria-live="off">c</div>',
])(
	'[no-default-aria-value-008] the default of the property is not the value of a role that gives another: %s',
	async code => {
		expect((await mlRuleTest(rule, code)).violations).toStrictEqual([]);
	},
);

test.each([
	['<div role="alert" aria-live="assertive">c</div>', 19, 'aria-live="assertive"'],
	['<div role="separator" aria-orientation="horizontal">d</div>', 23, 'aria-orientation="horizontal"'],
	['<div role="slider" tabindex="0" aria-valuenow="1" aria-valuemin="0">f</div>', 51, 'aria-valuemin="0"'],
])(
	'[no-default-aria-value-009] the implicit value of the role is the default of the element: %s',
	async (code, col, raw) => {
		expect((await mlRuleTest(rule, code)).violations).toStrictEqual([
			{ severity: 'warning', line: 1, col, message: 'It is default value', raw },
		]);
	},
);

test('[no-default-aria-value-010] a role that is not known until it is rendered gives no implicit value to compare with', async () => {
	const { violations } = await mlRuleTest(rule, '<div role={role} aria-live="off" />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});
