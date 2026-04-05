import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[wai-aria-disallowed-props-valid-001] allowed prop on role', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[wai-aria-disallowed-props-invalid-001] disallowed prop on role', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="heading" aria-pressed="true"></div>');
	expect(violations.length).toBe(1);
	expect(violations[0]!.severity).toBe('error');
});
