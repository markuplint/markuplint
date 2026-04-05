import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[wai-aria-deprecated-props-valid-001] non-deprecated prop', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[wai-aria-deprecated-props-valid-002] no aria props', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});
