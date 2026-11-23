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

test('[no-invalid-aria-prop-value-issue-4584-001] the allowed values are shown as written (`list` is also a keyword) with locale ja', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<input type="text" role="combobox" aria-autocomplete="foo">',
		undefined,
		false,
		'ja',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 36,
			message:
				'ARIAプロパティ「aria-autocomplete」では、「foo」は許可されていません。許可されている値は次のとおりです 「inline」「list」「both」「none」',
			raw: 'aria-autocomplete="foo"',
		},
	]);
});

test('[no-invalid-aria-prop-value-issue-4789-001] JSX: a value that only some roles allow is not judged where the role is not known until it is rendered', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	const source = [
		'<>',
		'<div role={props.role} aria-checked="mixed" />',
		'<div {...props} aria-checked="mixed" />',
		'</>',
	].join('\n');
	expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);

	// Control: the role that the markup tells is judged
	const { violations } = await mlRuleTest(rule, '<div role="radio" aria-checked="mixed" />', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 19,
			message: 'The "mixed" is disallowed on the "aria-checked" ARIA state',
			raw: 'aria-checked="mixed"',
		},
	]);
});

test('[no-invalid-aria-prop-value-issue-4789-002] JSX: a value that no role allows is reported where the role is not known until it is rendered', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	const { violations } = await mlRuleTest(rule, '<div role={props.role} aria-hidden="foo" />', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 24,
			message: 'The "foo" is disallowed on the "aria-hidden" ARIA state',
			raw: 'aria-hidden="foo"',
		},
	]);
});

test('[no-invalid-aria-prop-value-issue-4789-003] JSX: where the role is not known, a value is valid if the base type or any role-specific type allows it', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	const allowed = [
		'<>',
		'<div role={props.role} aria-checked="true" />',
		'<div role={props.role} aria-checked="mixed" />',
		'</>',
	];
	for (const version of ['1.1', '1.2', '1.3'] as const) {
		const options = { parser, rule: { options: { version } } };
		expect((await mlRuleTest(rule, allowed.join('\n'), options)).violations).toStrictEqual([]);

		// No type allows it
		const { violations } = await mlRuleTest(rule, '<div role={props.role} aria-checked="foo" />', options);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 24,
				message: 'The "foo" is disallowed on the "aria-checked" ARIA state',
				raw: 'aria-checked="foo"',
			},
		]);
	}
});

test('[no-invalid-aria-prop-value-issue-4789-004] JSX: a spread attribute after the role attribute may override it; one before it may not', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect(
		(await mlRuleTest(rule, '<div role="radio" {...props} aria-checked="mixed" />', { parser })).violations,
	).toStrictEqual([]);

	// Control: the role is the one written, and a radio does not allow `mixed`
	const { violations } = await mlRuleTest(rule, '<div {...props} role="radio" aria-checked="mixed" />', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 30,
			message: 'The "mixed" is disallowed on the "aria-checked" ARIA state',
			raw: 'aria-checked="mixed"',
		},
	]);
});
