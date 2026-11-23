import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-deprecated-aria-prop-valid-001] non-deprecated prop', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[no-deprecated-aria-prop-valid-002] no aria props', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});

test('[no-deprecated-aria-prop-valid-003] a DPUB-ARIA subclass of link keeps the properties link supports', async () => {
	expect(
		(await mlRuleTest(rule, '<a href="#n1" role="doc-noteref" aria-haspopup="true">1</a>')).violations,
	).toStrictEqual([]);
});

test('[no-deprecated-aria-prop-invalid-001] a DPUB-ARIA subclass of section takes the properties deprecated on section', async () => {
	expect(
		(await mlRuleTest(rule, '<section role="doc-abstract" aria-errormessage="x"></section>')).violations,
	).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 30,
			message: 'The "aria-errormessage" ARIA property is deprecated on the "doc-abstract" role',
			raw: 'aria-errormessage="x"',
		},
	]);
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

test('[no-deprecated-aria-prop-issue-4789-001] JSX: an element whose role is not known until it is rendered is not judged by the implicit role', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	const source = [
		'<>',
		'<div role={props.role} aria-disabled="true" />',
		'<div {...props} aria-disabled="true" />',
		'</>',
	].join('\n');
	expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);

	// Control: a role that the markup tells is judged
	const { violations } = await mlRuleTest(rule, '<div role="button" aria-errormessage="x" />', { parser });
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

test('[no-deprecated-aria-prop-issue-4789-002] JSX: a spread attribute after the role attribute may override it; one before it may not', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect(
		(await mlRuleTest(rule, '<div role="button" {...props} aria-errormessage="x" />', { parser })).violations,
	).toStrictEqual([]);

	// Control: the role is the one written
	const { violations } = await mlRuleTest(rule, '<div {...props} role="button" aria-errormessage="x" />', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 31,
			message: 'The "aria-errormessage" ARIA property is deprecated on the "button" role',
			raw: 'aria-errormessage="x"',
		},
	]);
});
