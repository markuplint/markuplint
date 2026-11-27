import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-contradictory-aria-prop-001] no contradictory prop conflict', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[no-contradictory-aria-prop-002] redundant (same value) is not contradictory', async () => {
	expect((await mlRuleTest(rule, '<input type="checkbox" aria-checked="true" checked />')).violations).toStrictEqual(
		[],
	);
});

test('[no-contradictory-aria-prop-003] aria-checked contradicts native checked attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="checkbox" checked aria-checked="false" />');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 32,
			message: 'The "aria-checked" ARIA state contradicts the current "checked" attribute',
			raw: 'aria-checked="false"',
		},
	]);
});

test('[no-contradictory-aria-prop-004] an upper-case aria-* is reported like the lower-case one', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="checkbox" checked ARIA-CHECKED="false" />');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 32,
			message: 'The "ARIA-CHECKED" ARIA state contradicts the current "checked" attribute',
			raw: 'ARIA-CHECKED="false"',
		},
	]);
});

test('[no-contradictory-aria-prop-005] JSX: an upper-case aria-* on an HTML element is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="checkbox" checked ARIA-CHECKED="false" />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 32,
			message: 'The "ARIA-CHECKED" ARIA state contradicts the current "checked" attribute',
			raw: 'ARIA-CHECKED="false"',
		},
	]);
});

test('[no-contradictory-aria-prop-006] the message is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<input required aria-required="false">', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 17,
			message: 'ARIAプロパティ「aria-required」は現在の属性「required」と矛盾しています',
			raw: 'aria-required="false"',
		},
	]);
});

/**
 * ARIA in HTML §4.2 lets an author use `aria-required`, `aria-disabled` and `aria-readonly`
 * in place of their native attributes; only the value `"false"` beside the native attribute is
 * forbidden for them. `aria-checked` is the exception: the checkedness of the element can be in
 * opposition to it.
 *
 * @see https://www.w3.org/TR/html-aria/#docconformance-attr
 */
test.each([
	'<input type="text" aria-required="true">',
	'<input type="text" aria-readonly="true">',
	'<input type="text" aria-disabled="true">',
	'<button type="button" aria-disabled="true">Save</button>',
])(
	'[no-contradictory-aria-prop-008] aria-required/-readonly/-disabled="true" without the native attribute is allowed: %s',
	async markup => {
		expect((await mlRuleTest(rule, markup)).violations).toStrictEqual([]);
	},
);

test.each(['<textarea aria-readonly="true"></textarea>', '<select aria-required="true"></select>'])(
	'[no-contradictory-aria-prop-009] aria-readonly/-required="true" without the native attribute is allowed on textarea and select: %s',
	async markup => {
		expect((await mlRuleTest(rule, markup)).violations).toStrictEqual([]);
	},
);

test('[no-contradictory-aria-prop-010] JSX: aria-required={true} without required is allowed', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" aria-required={true} />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-contradictory-aria-prop-011] JSX: aria-required={false} beside required is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" required aria-required={false} />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 29,
			message: 'The "aria-required" ARIA property contradicts the current "required" attribute',
			raw: 'aria-required={false}',
		},
	]);
});

test('[no-contradictory-aria-prop-012] aria-checked="true" without checked still contradicts the implicit checkedness', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="checkbox" aria-checked="true" />');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 24,
			message: 'The "aria-checked" ARIA state contradicts the implicit "checked" attribute',
			raw: 'aria-checked="true"',
		},
	]);
});

test.each(['<input type="text" aria-required="false">', '<input type="checkbox" aria-checked="false">'])(
	'[no-contradictory-aria-prop-013] a "false" value without the native attribute is not reported: %s',
	async markup => {
		expect((await mlRuleTest(rule, markup)).violations).toStrictEqual([]);
	},
);

test('[no-contradictory-aria-prop-014] aria-hidden="true" without the hidden attribute is allowed', async () => {
	expect((await mlRuleTest(rule, '<div aria-hidden="true"></div>')).violations).toStrictEqual([]);
});

test.each([
	'<div role="textbox" aria-required="true"></div>',
	'<div role="checkbox" aria-checked="true"></div>',
	'<input type="text" aria-checked="true">',
])(
	'[no-contradictory-aria-prop-015] an element to which the native attribute does not apply is not reported: %s',
	async markup => {
		expect((await mlRuleTest(rule, markup)).violations).toStrictEqual([]);
	},
);

test('[no-contradictory-aria-prop-016] the value is compared trimmed and case-insensitively', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="checkbox" aria-checked=" TRUE " />');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 24,
			message: 'The "aria-checked" ARIA state contradicts the implicit "checked" attribute',
			raw: 'aria-checked=" TRUE "',
		},
	]);
});

test('[no-contradictory-aria-prop-017] a value is trimmed of ASCII white space only: U+00A0 is a character of it', async () => {
	expect(
		(await mlRuleTest(rule, '<input type="checkbox" checked aria-checked=" false " />')).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 32,
			message: 'The "aria-checked" ARIA state contradicts the current "checked" attribute',
			raw: 'aria-checked=" false "',
		},
	]);
	expect(
		(await mlRuleTest(rule, '<input type="checkbox" checked aria-checked="false\u00A0" />')).violations,
	).toStrictEqual([]);
});
