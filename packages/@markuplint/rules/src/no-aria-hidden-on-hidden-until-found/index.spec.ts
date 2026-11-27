import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-aria-hidden-on-hidden-until-found-001] hidden=until-found without aria-hidden', async () => {
	expect((await mlRuleTest(rule, '<div hidden="until-found">Hidden content</div>')).violations).toStrictEqual([]);
});

test('[no-aria-hidden-on-hidden-until-found-002] aria-hidden=true with a plain hidden attribute', async () => {
	expect((await mlRuleTest(rule, '<div hidden aria-hidden="true">Hidden content</div>')).violations).toStrictEqual(
		[],
	);
});

test('[no-aria-hidden-on-hidden-until-found-003] aria-hidden=false with hidden=until-found', async () => {
	expect(
		(await mlRuleTest(rule, '<div hidden="until-found" aria-hidden="false">Hidden content</div>')).violations,
	).toStrictEqual([]);
});

test('[no-aria-hidden-on-hidden-until-found-004] aria-hidden=true with hidden=until-found', async () => {
	const { violations } = await mlRuleTest(rule, '<div hidden="until-found" aria-hidden="true">Hidden content</div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 27,
			message: '"aria-hidden" must not be "true" on an element with "hidden" value "until-found"',
			raw: 'aria-hidden="true"',
		},
	]);
});

test('[no-aria-hidden-on-hidden-until-found-005] an upper-case ARIA-HIDDEN attribute name is matched', async () => {
	const { violations } = await mlRuleTest(rule, '<div hidden="until-found" ARIA-HIDDEN="true">Hidden content</div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 27,
			message: '"aria-hidden" must not be "true" on an element with "hidden" value "until-found"',
			raw: 'ARIA-HIDDEN="true"',
		},
	]);
});

test('[no-aria-hidden-on-hidden-until-found-006] a whitespace-padded hidden value is not the until-found keyword', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div hidden=" UNTIL-FOUND " aria-hidden=" TRUE ">Hidden content</div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-aria-hidden-on-hidden-until-found-007] a dynamic (Vue-bound) aria-hidden value is skipped', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<template><div hidden="until-found" :aria-hidden="isHidden">Hidden content</div></template>',
		{
			parser: { '.*': '@markuplint/vue-parser' },
		},
	);
	expect(violations).toStrictEqual([]);
});

test('[no-aria-hidden-on-hidden-until-found-008] the values are shown as written with locale ja', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div hidden="until-found" aria-hidden="true"></div>',
		undefined,
		false,
		'ja',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 27,
			message: 'hidden属性の値が「until-found」である要素では、aria-hidden属性を「true」にしてはいけません',
			raw: 'aria-hidden="true"',
		},
	]);
});

test.each([' true ', 'true\u00A0'])(
	'[no-aria-hidden-on-hidden-until-found-009] aria-hidden with white space around it is not true, as browsers read it: %j',
	async value => {
		const { violations } = await mlRuleTest(rule, `<div hidden="until-found" aria-hidden="${value}">a</div>`);
		expect(violations).toStrictEqual([]);
	},
);

test('[no-aria-hidden-on-hidden-until-found-010] both keywords are compared ASCII case-insensitively', async () => {
	const { violations } = await mlRuleTest(rule, '<div hidden="UNTIL-FOUND" aria-hidden="TRUE">a</div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 27,
			message: '"aria-hidden" must not be "true" on an element with "hidden" value "until-found"',
			raw: 'aria-hidden="TRUE"',
		},
	]);
});
