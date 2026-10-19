import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[role-supports-aria-prop-valid-001] allowed prop on role', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[role-supports-aria-prop-invalid-001] disallowed prop on role', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="heading" aria-pressed="true"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message: 'The "aria-pressed" ARIA state is disallowed on the "heading" role',
			raw: 'aria-pressed="true"',
		},
	]);
});

test('[role-supports-aria-prop-issue-4309-001] an upper-case aria-* that the role supports is not reported', async () => {
	expect((await mlRuleTest(rule, '<button ARIA-LABEL="x"></button>')).violations).toStrictEqual([]);
});

test('[role-supports-aria-prop-issue-4309-002] an upper-case aria-* that the role does not support is reported by the spelling written', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="heading" ARIA-PRESSED="true"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message: 'The "ARIA-PRESSED" ARIA state is disallowed on the "heading" role',
			raw: 'ARIA-PRESSED="true"',
		},
	]);
});

test('[role-supports-aria-prop-issue-4309-003] JSX: an upper-case aria-* on an HTML element is checked like the lower-case one', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<button ARIA-LABEL="x" />', { parser })).violations).toStrictEqual([]);

	// Control: the same upper-case name is reported where the role does not support it
	const { violations } = await mlRuleTest(rule, '<div role="heading" ARIA-PRESSED="true" />', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message: 'The "ARIA-PRESSED" ARIA state is disallowed on the "heading" role',
			raw: 'ARIA-PRESSED="true"',
		},
	]);
});

test('[role-supports-aria-prop-issue-4309-004] JSX: an upper-case aria-* on an svg element is not an ARIA attribute', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<svg role="heading" ARIA-PRESSED="true" />', { parser })).violations).toStrictEqual(
		[],
	);

	// Control: the lower-case name is reported on the same element
	const { violations } = await mlRuleTest(rule, '<svg role="heading" aria-pressed="true" />', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message: 'The "aria-pressed" ARIA state is disallowed on the "heading" role',
			raw: 'aria-pressed="true"',
		},
	]);
});
