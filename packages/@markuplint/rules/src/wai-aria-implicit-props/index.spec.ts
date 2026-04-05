import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[wai-aria-implicit-props-valid-001] no implicit prop conflict', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[wai-aria-implicit-props-invalid-001] implicit prop same as native attr', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="checkbox" aria-checked="true" checked />');
	expect(violations.length).toBeGreaterThanOrEqual(1);
	expect(violations[0]!.severity).toBe('warning');
});
