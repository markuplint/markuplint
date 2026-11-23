import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

test('[no-ineffective-attr-invalid-001] script[defer]', async () => {
	const { violations } = await mlRuleTest(rule, '<script defer>const foo = "foo";</script>');

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 9,
			message: 'The "defer" attribute is ineffective. It doesn\'t need the attribute',
			raw: 'defer',
		},
	]);
});

// There are no tests of `defer` on `type=module`: HTML LS § 4.12.1 ("Module scripts must not specify
// the defer attribute") is reflected in spec.script.jsonc, so module+defer is disallowed by
// `no-disallowed-attr` and is not flagged as ineffective.

describe('fix', () => {
	test('[no-ineffective-attr-fix-001] remove ineffective defer from inline script', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<script defer>const foo = "foo";</script>', undefined, true);
		expect(fixedCode).toBe('<script>const foo = "foo";</script>');
	});
});

test('[no-ineffective-attr-issue-4309-001] an upper-case name is the attribute in HTML', async () => {
	const { violations } = await mlRuleTest(rule, '<script DEFER>const foo = "foo";</script>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 9,
			message: 'The "DEFER" attribute is ineffective. It doesn\'t need the attribute',
			raw: 'DEFER',
		},
	]);
});

test('[no-ineffective-attr-issue-4309-002] an HTML element in JSX folds the name', async () => {
	const options = { parser: { '.*': '@markuplint/jsx-parser' } };
	const upper = await mlRuleTest(rule, '<script DEFER></script>', options);
	expect(upper.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 9,
			message: 'The "DEFER" attribute is ineffective. It doesn\'t need the attribute',
			raw: 'DEFER',
		},
	]);
	const lower = await mlRuleTest(rule, '<script defer></script>', options);
	expect(lower.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 9,
			message: 'The "defer" attribute is ineffective. It doesn\'t need the attribute',
			raw: 'defer',
		},
	]);
});

describe('issue-4435', () => {
	const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };

	test('[no-ineffective-attr-issue-4435-001] an attribute that the framework renders is judged as before', async () => {
		const { violations } = await mlRuleTest(rule, '<script defer={true}>const foo = "foo";</script>', jsx);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 9,
				message: 'The "defer" attribute is ineffective. It doesn\'t need the attribute',
				raw: 'defer={true}',
			},
		]);
	});

	test('[no-ineffective-attr-issue-4435-002] code that is not a literal may be rendered, and is judged as before', async () => {
		const { violations } = await mlRuleTest(rule, '<script defer={cond}>const foo = "foo";</script>', jsx);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 9,
				message: 'The "defer" attribute is ineffective. It doesn\'t need the attribute',
				raw: 'defer={cond}',
			},
		]);
	});

	test('[no-ineffective-attr-issue-4435-003] an attribute that the framework does not output is not an attribute of the element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<><script defer={false}>const foo = "foo";</script><script defer={null}>const foo = "foo";</script></>',
			jsx,
		);
		expect(violations).toStrictEqual([]);
	});
});
