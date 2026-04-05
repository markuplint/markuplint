import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[wai-aria-required-props-valid-001] no role, no required props', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});

test('[wai-aria-required-props-valid-002] role with required props present', async () => {
	expect(
		(await mlRuleTest(rule, '<div role="slider" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>'))
			.violations,
	).toStrictEqual([]);
});

test('[wai-aria-required-props-invalid-001] role missing required prop', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="slider"></div>');
	expect(violations.length).toBeGreaterThanOrEqual(1);
	expect(violations[0]!.severity).toBe('error');
});
