import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-aria-on-presentational-children-valid-001] no presentational role ancestor', async () => {
	expect(
		(await mlRuleTest(rule, '<div role="group"><span aria-label="text"></span></div>')).violations,
	).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-invalid-001] aria attr on child of presentational children role', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button"><span aria-label="text"></span></div>');
	expect(violations.length).toBe(1);
	expect(violations[0]!.severity).toBe('warning');
});

test('[no-aria-on-presentational-children-valid-002] no aria on children', async () => {
	expect((await mlRuleTest(rule, '<div role="img"><span>text</span></div>')).violations).toStrictEqual([]);
});

test('[no-aria-on-presentational-children-issue-4309-001] an upper-case aria-* on a child is reported like the lower-case one', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button"><span ARIA-LABEL="text"></span></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 20,
			message:
				'It may be ineffective because it has the "button" role as an ancestor that doesn\'t expose its descendants to the accessibility tree',
			raw: '<span ARIA-LABEL="text">',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4309-002] an upper-case role on a child is reported like the lower-case one', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button"><span ROLE="img"></span></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 20,
			message:
				'It may be ineffective because it has the "button" role as an ancestor that doesn\'t expose its descendants to the accessibility tree',
			raw: '<span ROLE="img">',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4309-003] JSX: an upper-case aria-* on an HTML child is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button"><span ARIA-LABEL="text" /></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 20,
			message:
				'It may be ineffective because it has the "button" role as an ancestor that doesn\'t expose its descendants to the accessibility tree',
			raw: '<span ARIA-LABEL="text" />',
		},
	]);
});

test('[no-aria-on-presentational-children-issue-4309-004] JSX: an upper-case aria-* on an svg child is not an ARIA attribute', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect(
		(await mlRuleTest(rule, '<div role="button"><svg ARIA-LABEL="text" /></div>', { parser })).violations,
	).toStrictEqual([]);

	// Control: the lower-case name is reported on the same child
	const { violations } = await mlRuleTest(rule, '<div role="button"><svg aria-label="text" /></div>', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 20,
			message:
				'It may be ineffective because it has the "button" role as an ancestor that doesn\'t expose its descendants to the accessibility tree',
			raw: '<svg aria-label="text" />',
		},
	]);
});
