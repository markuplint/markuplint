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
