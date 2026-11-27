import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-redundant-aria-prop-001] no redundant prop conflict', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[no-redundant-aria-prop-002] implicit prop same as native attr', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="checkbox" aria-checked="true" checked />');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 24,
			message:
				'The "aria-checked" ARIA state has the same semantics as the current "checked" attribute or the implicit "checked" attribute',
			raw: 'aria-checked="true"',
		},
	]);
});

test('[no-redundant-aria-prop-003] an upper-case aria-* is reported like the lower-case one', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="checkbox" ARIA-CHECKED="true" checked />');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 24,
			message:
				'The "ARIA-CHECKED" ARIA state has the same semantics as the current "checked" attribute or the implicit "checked" attribute',
			raw: 'ARIA-CHECKED="true"',
		},
	]);
});

test('[no-redundant-aria-prop-004] JSX: an upper-case aria-* on an HTML element is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="checkbox" ARIA-CHECKED="true" checked />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 24,
			message:
				'The "ARIA-CHECKED" ARIA state has the same semantics as the current "checked" attribute or the implicit "checked" attribute',
			raw: 'ARIA-CHECKED="true"',
		},
	]);
});

test('[no-redundant-aria-prop-005] the message is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<input required aria-required="true">', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 17,
			message:
				'ARIAプロパティ「aria-required」は現在の属性「required」もしくは暗黙の属性「required」と同等のセマンティクスを持っています',
			raw: 'aria-required="true"',
		},
	]);
});

test('[no-redundant-aria-prop-007] a value with white space around it is not the keyword, ASCII or U+00A0', async () => {
	expect(
		(await mlRuleTest(rule, '<input type="checkbox" aria-checked=" true " checked />')).violations,
	).toStrictEqual([]);
	expect(
		(await mlRuleTest(rule, '<input type="checkbox" aria-checked="true\u00A0" checked />')).violations,
	).toStrictEqual([]);
});

test.each([
	['10', 30],
	['10.0', 32],
	['1e1', 31],
])('[no-redundant-aria-prop-008] a number is compared as a number: max=%j', async (max, col) => {
	const { violations } = await mlRuleTest(
		rule,
		`<input type="range" max="${max}" aria-valuemax="10" aria-label="b">`,
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col,
			message:
				'The "aria-valuemax" ARIA property has the same semantics as the current "max" attribute or the implicit "max" attribute',
			raw: 'aria-valuemax="10"',
		},
	]);
});

test('[no-redundant-aria-prop-009] an integer is compared as the browser parses it', async () => {
	const { violations } = await mlRuleTest(rule, '<table><tr><td colspan=" 2" aria-colspan="2">a</td></tr></table>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 29,
			message:
				'The "aria-colspan" ARIA property has the same semantics as the current "colspan" attribute or the implicit "colspan" attribute',
			raw: 'aria-colspan="2"',
		},
	]);
});

const colspanMessage =
	'The "aria-colspan" ARIA property has the same semantics as the current "colspan" attribute or the implicit "colspan" attribute';

test.each([
	['<table><tr><td colspan="0" aria-colspan="1">a</td></tr></table>', 28, 'aria-colspan="1"', colspanMessage],
	[
		'<table><tr><td colspan="2000" aria-colspan="1000">a</td></tr></table>',
		31,
		'aria-colspan="1000"',
		colspanMessage,
	],
	[
		'<meter max="1.0" aria-valuemax="1" value="0">a</meter>',
		18,
		'aria-valuemax="1"',
		'The "aria-valuemax" ARIA property has the same semantics as the current "max" attribute or the implicit "max" attribute',
	],
])('[no-redundant-aria-prop-010] a number is the one the browser reads: %s', async (code, col, raw, message) => {
	expect((await mlRuleTest(rule, code)).violations).toStrictEqual([
		{ severity: 'warning', line: 1, col, message, raw },
	]);
});

test('[no-redundant-aria-prop-011] the zero-length value restates nothing', async () => {
	expect(
		(await mlRuleTest(rule, '<input type="range" max="10" aria-valuemax="" aria-label="x">')).violations,
	).toStrictEqual([]);
});
