import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[wai-aria-implicit-role-valid-001] different from implicit role', async () => {
	expect((await mlRuleTest(rule, '<nav role="menu"></nav>')).violations).toStrictEqual([]);
});

test('[wai-aria-implicit-role-invalid-001] same as implicit role', async () => {
	expect((await mlRuleTest(rule, '<nav role="navigation"></nav>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 12,
			message: 'The "navigation" role is the implicit role of the "nav" element',
			raw: 'navigation',
		},
	]);
});

// S2 regression: Issue #3641 reshaped wai-aria's implicit-vs-permitted interaction,
// but this standalone rule must still fire for elements where the implicit role and
// the element's permittedRoles combination previously masked the duplication.
test('[wai-aria-implicit-role-invalid-002] html with role=document is implicit in ARIA 1.1', async () => {
	expect(
		(
			await mlRuleTest(rule, '<html role="document"><head></head><body></body></html>', {
				rule: { options: { version: '1.1' } },
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 13,
			message: 'The "document" role is the implicit role of the "html" element',
			raw: 'document',
		},
	]);
});
