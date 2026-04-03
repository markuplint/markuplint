import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[ineffective-attr-invalid-001] script[defer]', async () => {
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

test('[ineffective-attr-invalid-002] script[src][type=module][defer]', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="module" src="path/to" defer></script>');

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 37,
			message: 'The "defer" attribute is ineffective. It doesn\'t need the attribute',
			raw: 'defer',
		},
	]);
});

describe('fix', () => {
	test('[ineffective-attr-fix-001] remove ineffective defer from inline script', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<script defer>const foo = "foo";</script>', undefined, true);
		expect(fixedCode).toBe('<script>const foo = "foo";</script>');
	});

	test('[ineffective-attr-fix-002] remove ineffective defer from module script', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<script type="module" src="path/to" defer></script>',
			undefined,
			true,
		);
		expect(fixedCode).toBe('<script type="module" src="path/to"></script>');
	});
});
