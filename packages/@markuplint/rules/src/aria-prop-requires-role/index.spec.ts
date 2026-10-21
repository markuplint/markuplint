import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[aria-prop-requires-role-valid-001] global prop without role', async () => {
	expect((await mlRuleTest(rule, '<div aria-label="text"></div>')).violations).toStrictEqual([]);
});

test('[aria-prop-requires-role-valid-002] any prop with role', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[aria-prop-requires-role-issue-4309-001] a global prop in upper case without role is valid', async () => {
	expect((await mlRuleTest(rule, '<div ARIA-LABEL="text"></div>')).violations).toStrictEqual([]);
});

test('[aria-prop-requires-role-issue-4309-002] a non-global prop in upper case without role is reported by the spelling written', async () => {
	const { violations } = await mlRuleTest(rule, '<cite ARIA-PRESSED="true"></cite>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 7,
			message: 'The "ARIA-PRESSED" ARIA state is not global state',
			raw: 'ARIA-PRESSED="true"',
		},
	]);
});

test('[aria-prop-requires-role-issue-4309-003] JSX: an upper-case aria-* on an HTML element is checked like the lower-case one', async () => {
	const { violations } = await mlRuleTest(rule, '<cite ARIA-PRESSED="true" />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 7,
			message: 'The "ARIA-PRESSED" ARIA state is not global state',
			raw: 'ARIA-PRESSED="true"',
		},
	]);
});

test('[aria-prop-requires-role-issue-4309-004] JSX: an upper-case aria-* on an svg element is not an ARIA attribute', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<svg><circle ARIA-PRESSED="true" /></svg>', { parser })).violations).toStrictEqual(
		[],
	);

	// Control: the lower-case name is reported on the same element
	const { violations } = await mlRuleTest(rule, '<svg><circle aria-pressed="true" /></svg>', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 14,
			message: 'The "aria-pressed" ARIA state is not global state',
			raw: 'aria-pressed="true"',
		},
	]);
});
