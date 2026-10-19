import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-contradictory-aria-prop-valid-001] no contradictory prop conflict', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[no-contradictory-aria-prop-valid-002] redundant (same value) is not contradictory', async () => {
	expect((await mlRuleTest(rule, '<input type="checkbox" aria-checked="true" checked />')).violations).toStrictEqual(
		[],
	);
});

test('[no-contradictory-aria-prop-invalid-001] aria-checked contradicts native checked attribute', async () => {
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

test('[no-contradictory-aria-prop-issue-4309-001] an upper-case aria-* is reported like the lower-case one', async () => {
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

test('[no-contradictory-aria-prop-issue-4309-002] JSX: an upper-case aria-* on an HTML element is reported', async () => {
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
