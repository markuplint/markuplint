import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-default-aria-value-valid-001] no aria props', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});

test('[no-default-aria-value-valid-002] non-default value', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[no-default-aria-value-issue-4309-001] the lower-case spelling is reported (baseline of the upper-case one)', async () => {
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

test('[no-default-aria-value-issue-4309-002] an upper-case aria-* is reported like the lower-case one', async () => {
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

test('[no-default-aria-value-issue-4309-003] JSX: an upper-case aria-* on an HTML element is reported', async () => {
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

test('[no-default-aria-value-issue-4309-004] JSX: an upper-case aria-* on an svg element is not an ARIA attribute', async () => {
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
