import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-redundant-accessible-name-issue-4435-001] a component that no pretender resolved renders what is not known', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<label><input type="checkbox" aria-label="Notifications" /><Chip label="Notifications" /></label>',
		{ parser: { '.*': '@markuplint/jsx-parser' } },
	);
	expect(violations).toStrictEqual([]);
});

test('[no-redundant-accessible-name-issue-4435-002] the same text in an element that is known is reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<label><input type="checkbox" aria-label="Notifications" /><span>Notifications</span></label>',
		{ parser: { '.*': '@markuplint/jsx-parser' } },
	);
	expect(violations.map(violation => violation.message)).toStrictEqual([
		'The accessible name from "aria-label" overrides "label"',
	]);
});
