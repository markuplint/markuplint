import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const intersection = 'The "as" attribute expects either "script", "style"';

test('[no-invalid-attr-value-issue-4494-001] both keywords accept the destinations they share', async () => {
	for (const dest of ['script', 'style', 'Script']) {
		expect(
			(await mlRuleTest(rule, `<link rel="preload modulepreload" href="a.js" as="${dest}">`)).violations,
			dest,
		).toStrictEqual([]);
	}
});

test('[no-invalid-attr-value-issue-4494-002] as=fetch is not a module preload destination', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="preload modulepreload" href="a.js" as="fetch">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 51,
			message: intersection,
			raw: 'fetch',
		},
	]);
});

test('[no-invalid-attr-value-issue-4494-003] as=text is not a preload destination', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="preload modulepreload" href="a.txt" as="text">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 52,
			message: intersection,
			raw: 'text',
		},
	]);
});

test('[no-invalid-attr-value-issue-4494-004] a destination only one keyword allows is not offered', async () => {
	for (const dest of ['font', 'image', 'track', 'json', 'worker']) {
		const { violations } = await mlRuleTest(rule, `<link rel="preload modulepreload" href="a.js" as="${dest}">`);
		expect(violations, dest).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 51,
				message: intersection,
				raw: dest,
			},
		]);
	}
});

test('[no-invalid-attr-value-issue-4494-005] keyword order does not change the accepted set', async () => {
	expect(
		(await mlRuleTest(rule, '<link rel="modulepreload preload" href="a.js" as="script">')).violations,
	).toStrictEqual([]);
	const { violations } = await mlRuleTest(rule, '<link rel="modulepreload preload" href="a.js" as="text">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 51,
			message: intersection,
			raw: 'text',
		},
	]);
});

test('[no-invalid-attr-value-issue-4494-006] another case of both keywords is accepted', async () => {
	expect(
		(await mlRuleTest(rule, '<link rel="PRELOAD MODULEPRELOAD" href="a.js" as="SCRIPT">')).violations,
	).toStrictEqual([]);
	const { violations } = await mlRuleTest(rule, '<link rel="PRELOAD MODULEPRELOAD" href="a.js" as="FETCH">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 51,
			message: intersection,
			raw: 'FETCH',
		},
	]);
});

test('[no-invalid-attr-value-issue-4494-007] an empty as and surrounding spaces are not in the intersection', async () => {
	const empty = await mlRuleTest(rule, '<link rel="preload modulepreload" href="a.js" as="">');
	expect(empty.violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 51,
			message: intersection,
			raw: '',
		},
	]);
	const spaced = await mlRuleTest(rule, '<link rel="preload modulepreload" href="a.js" as=" script ">');
	expect(spaced.violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 51,
			message: intersection,
			raw: ' script ',
		},
	]);
});

test('[no-invalid-attr-value-issue-4494-008] an enum that allows surrounding spaces reports them in raw', async () => {
	const { violations } = await mlRuleTest(rule, '<svg><text lengthAdjust=" Bad ">x</text></svg>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 26,
			message: 'The "lengthAdjust" attribute expects either "spacing", "spacingAndGlyphs"',
			raw: ' Bad ',
		},
	]);
});
