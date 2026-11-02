import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[require-aria-prop-issue-4435-001] an attribute that the framework does not output is not the required property', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="checkbox" aria-checked={null}></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'Require the "aria-checked" ARIA state on the "checkbox" role',
			raw: '<div role="checkbox" aria-checked={null}>',
		},
	]);
});

test('[require-aria-prop-issue-4435-002] code that is not a literal may be the property', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="checkbox" aria-checked={cond}></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});
