import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-redundant-role-001] different from implicit role', async () => {
	expect((await mlRuleTest(rule, '<nav role="menu"></nav>')).violations).toStrictEqual([]);
});

test('[no-redundant-role-002] same as implicit role', async () => {
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

// S2 regression: this standalone rule must still fire for elements where the implicit role and
// the element's permittedRoles combination could mask the duplication (the implicit-vs-permitted
// interaction of wai-aria).
test('[no-redundant-role-003] html with role=document is implicit in ARIA 1.1', async () => {
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

test('[no-redundant-role-004] of two `role` attributes, the one that the element has is checked', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<button role="link" role="button" />', { parser })).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 27,
			message: 'The "button" role is the implicit role of the "button" element',
			raw: 'button',
		},
	]);
	expect((await mlRuleTest(rule, '<button role="button" role="link"></button>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 15,
			message: 'The "button" role is the implicit role of the "button" element',
			raw: 'button',
		},
	]);
});
