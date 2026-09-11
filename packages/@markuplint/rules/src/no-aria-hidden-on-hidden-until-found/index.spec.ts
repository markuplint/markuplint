import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-aria-hidden-on-hidden-until-found-valid-001] hidden=until-found without aria-hidden', async () => {
	expect((await mlRuleTest(rule, '<div hidden="until-found">Hidden content</div>')).violations).toStrictEqual([]);
});

test('[no-aria-hidden-on-hidden-until-found-valid-002] aria-hidden=true with a plain hidden attribute', async () => {
	expect((await mlRuleTest(rule, '<div hidden aria-hidden="true">Hidden content</div>')).violations).toStrictEqual(
		[],
	);
});

test('[no-aria-hidden-on-hidden-until-found-valid-003] aria-hidden=false with hidden=until-found', async () => {
	expect(
		(await mlRuleTest(rule, '<div hidden="until-found" aria-hidden="false">Hidden content</div>')).violations,
	).toStrictEqual([]);
});

test('[no-aria-hidden-on-hidden-until-found-invalid-001] aria-hidden=true with hidden=until-found', async () => {
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

test('[no-aria-hidden-on-hidden-until-found-invalid-002] case-insensitive and whitespace-padded values still match', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div hidden=" UNTIL-FOUND " aria-hidden=" TRUE ">Hidden content</div>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 29,
			message: '"aria-hidden" must not be "true" on an element with "hidden" value "until-found"',
			raw: 'aria-hidden=" TRUE "',
		},
	]);
});

test('[no-aria-hidden-on-hidden-until-found-parser-001] a dynamic (Vue-bound) aria-hidden value is skipped', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<template><div hidden="until-found" :aria-hidden="isHidden">Hidden content</div></template>',
		{
			parser: { '.*': '@markuplint/vue-parser' },
		},
	);
	expect(violations).toStrictEqual([]);
});
