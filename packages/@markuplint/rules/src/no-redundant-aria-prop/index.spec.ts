import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-redundant-aria-prop-valid-001] no redundant prop conflict', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[no-redundant-aria-prop-invalid-001] implicit prop same as native attr', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="checkbox" aria-checked="true" checked />');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 24,
			message:
				'The "aria-checked" ARIA state has the same semantics as the current "checked" attribute or the implicit "checked" attribute',
			raw: 'aria-checked="true"',
		},
	]);
});
