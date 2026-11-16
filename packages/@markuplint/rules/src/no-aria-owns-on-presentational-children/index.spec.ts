import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-aria-owns-on-presentational-children-valid-001] aria-owns on a role whose children are not presentational', async () => {
	expect(
		(await mlRuleTest(rule, '<div role="listbox" aria-owns="o"></div><div id="o" role="option"></div>')).violations,
	).toStrictEqual([]);
});

test('[no-aria-owns-on-presentational-children-invalid-001] an implicit role whose children are presentational', async () => {
	expect(
		(await mlRuleTest(rule, '<button type="button" aria-owns="x">Save</button><span id="x"></span>')).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 23,
			message:
				'"aria-owns" must not be specified on an element with the "button" role, whose children are presentational',
			raw: 'aria-owns="x"',
		},
	]);
});

test('[no-aria-owns-on-presentational-children-invalid-002] an explicit role whose children are presentational', async () => {
	expect(
		(await mlRuleTest(rule, '<div role="img" aria-label="Logo" aria-owns="x"></div><span id="x"></span>'))
			.violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 35,
			message:
				'"aria-owns" must not be specified on an element with the "img" role, whose children are presentational',
			raw: 'aria-owns="x"',
		},
	]);
});

test('[no-aria-owns-on-presentational-children-invalid-003] with locale ja', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<button type="button" aria-owns="x">Save</button><span id="x"></span>',
				undefined,
				false,
				'ja',
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 23,
			message: '子孫がプレゼンテーショナルになる「button」ロールの要素にaria-owns属性を指定してはいけません',
			raw: 'aria-owns="x"',
		},
	]);
});

test('[no-aria-owns-on-presentational-children-invalid-004] reported under WAI-ARIA 1.2 as well', async () => {
	expect(
		(
			await mlRuleTest(rule, '<button type="button" aria-owns="x">Save</button><span id="x"></span>', {
				rule: { options: { version: '1.2' } },
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 23,
			message:
				'"aria-owns" must not be specified on an element with the "button" role, whose children are presentational',
			raw: 'aria-owns="x"',
		},
	]);
});

test('[no-aria-owns-on-presentational-children-invalid-005] an empty aria-owns is still specified', async () => {
	expect((await mlRuleTest(rule, '<button type="button" aria-owns="">Save</button>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 23,
			message:
				'"aria-owns" must not be specified on an element with the "button" role, whose children are presentational',
			raw: 'aria-owns=""',
		},
	]);
});
