import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[wai-aria-no-global-prop-valid-001] global prop without role', async () => {
	expect((await mlRuleTest(rule, '<div aria-label="text"></div>')).violations).toStrictEqual([]);
});

test('[wai-aria-no-global-prop-valid-002] any prop with role', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});
