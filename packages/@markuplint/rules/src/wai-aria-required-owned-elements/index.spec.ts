import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[wai-aria-required-owned-elements-valid-001] list with listitem', async () => {
	expect((await mlRuleTest(rule, '<div role="list"><div role="listitem">item</div></div>')).violations).toStrictEqual(
		[],
	);
});

test('[wai-aria-required-owned-elements-valid-002] no role', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});

test('[wai-aria-required-owned-elements-invalid-001] list without listitem', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="list"><div>not a listitem</div></div>');
	expect(violations.length).toBe(1);
	expect(violations[0]!.severity).toBe('warning');
});
