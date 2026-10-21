import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-invalid-aria-prop-value-valid-001] valid aria value', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[no-invalid-aria-prop-value-invalid-001] invalid aria value', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button" aria-pressed="hoge"></div>');
	expect(violations.length).toBe(1);
	expect(violations[0]!.severity).toBe('error');
});

test('[no-invalid-aria-prop-value-issue-4309-001] the lower-case spelling is reported (baseline of the upper-case one)', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button" aria-pressed="hoge"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 20,
			message: 'The "hoge" is disallowed on the "aria-pressed" ARIA state',
			raw: 'aria-pressed="hoge"',
		},
	]);
});

test('[no-invalid-aria-prop-value-issue-4309-002] an upper-case aria-* is reported like the lower-case one', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button" ARIA-PRESSED="hoge"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 20,
			message: 'The "hoge" is disallowed on the "ARIA-PRESSED" ARIA state',
			raw: 'ARIA-PRESSED="hoge"',
		},
	]);
});

test('[no-invalid-aria-prop-value-issue-4309-003] JSX: an upper-case aria-* on an HTML element is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button" ARIA-PRESSED="hoge" />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 20,
			message: 'The "hoge" is disallowed on the "ARIA-PRESSED" ARIA state',
			raw: 'ARIA-PRESSED="hoge"',
		},
	]);
});

test('[no-invalid-aria-prop-value-issue-4309-004] JSX: an upper-case aria-* on an svg element is not an ARIA attribute', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<svg role="button" ARIA-PRESSED="hoge" />', { parser })).violations).toStrictEqual(
		[],
	);

	// Control: the lower-case name is reported on the same element
	const { violations } = await mlRuleTest(rule, '<svg role="button" aria-pressed="hoge" />', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 20,
			message: 'The "hoge" is disallowed on the "aria-pressed" ARIA state',
			raw: 'aria-pressed="hoge"',
		},
	]);
});
