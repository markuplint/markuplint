import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-deprecated-aria-prop-valid-001] non-deprecated prop', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[no-deprecated-aria-prop-valid-002] no aria props', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});

test('[no-deprecated-aria-prop-issue-4309-001] the lower-case spelling is reported (baseline of the upper-case one)', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button" aria-errormessage="x"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 20,
			message: 'The "aria-errormessage" ARIA property is deprecated on the "button" role',
			raw: 'aria-errormessage="x"',
		},
	]);
});

test('[no-deprecated-aria-prop-issue-4309-002] an upper-case aria-* is reported like the lower-case one', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button" ARIA-ERRORMESSAGE="x"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 20,
			message: 'The "ARIA-ERRORMESSAGE" ARIA property is deprecated on the "button" role',
			raw: 'ARIA-ERRORMESSAGE="x"',
		},
	]);
});

test('[no-deprecated-aria-prop-issue-4309-003] JSX: an upper-case aria-* on an HTML element is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button" ARIA-ERRORMESSAGE="x" />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 20,
			message: 'The "ARIA-ERRORMESSAGE" ARIA property is deprecated on the "button" role',
			raw: 'ARIA-ERRORMESSAGE="x"',
		},
	]);
});

test('[no-deprecated-aria-prop-issue-4309-004] JSX: an upper-case aria-* on an svg element is not an ARIA attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<svg role="button" ARIA-ERRORMESSAGE="x" />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);

	// Control: the same rule reports the lower-case name on an svg element
	const control = await mlRuleTest(rule, '<svg role="button" aria-errormessage="x" />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(control.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 20,
			message: 'The "aria-errormessage" ARIA property is deprecated on the "button" role',
			raw: 'aria-errormessage="x"',
		},
	]);
});
