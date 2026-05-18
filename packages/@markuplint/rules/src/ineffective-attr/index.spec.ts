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

// Note: `[ineffective-attr-invalid-002]` and `[ineffective-attr-fix-002]` (defer on
// type=module) were removed when HTML LS § 4.12.1 ("Module scripts must not specify
// the defer attribute") was reflected in spec.script.jsonc — module+defer is now
// disallowed by `invalid-attr`, not flagged as ineffective. The numbering gap is
// intentional; do not renumber later tests.

describe('fix', () => {
	test('[ineffective-attr-fix-001] remove ineffective defer from inline script', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<script defer>const foo = "foo";</script>', undefined, true);
		expect(fixedCode).toBe('<script>const foo = "foo";</script>');
	});
});
