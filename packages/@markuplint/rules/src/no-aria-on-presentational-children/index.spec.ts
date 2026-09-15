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
