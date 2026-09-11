import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[require-aria-prop-valid-001] no role, no required props', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});

test('[require-aria-prop-valid-002] role with required props present', async () => {
	expect(
		(await mlRuleTest(rule, '<div role="slider" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>'))
			.violations,
	).toStrictEqual([]);
});

test('[require-aria-prop-invalid-001] role missing required prop', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="slider"></div>');
	expect(violations.length).toBeGreaterThanOrEqual(1);
	expect(violations[0]!.severity).toBe('error');
});

test('[require-aria-prop-issue-3682-001] non-focusable separator does not require aria-valuenow', async () => {
	expect((await mlRuleTest(rule, '<div role="separator"></div>')).violations).toStrictEqual([]);
});

test('[require-aria-prop-issue-3682-002] separator with tabindex="0" requires aria-valuenow', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="separator" tabindex="0"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'Require the "aria-valuenow" ARIA property on the "separator" role',
			raw: '<div role="separator" tabindex="0">',
		},
	]);
});

test('[require-aria-prop-issue-3682-003] focusable separator with aria-valuenow is valid', async () => {
	expect(
		(await mlRuleTest(rule, '<div role="separator" tabindex="0" aria-valuenow="50"></div>')).violations,
	).toStrictEqual([]);
});

test('[require-aria-prop-issue-3682-004] button with role="separator" requires aria-valuenow (button is interactive)', async () => {
	const { violations } = await mlRuleTest(rule, '<button role="separator">Drag</button>');
	expect(violations.length).toBeGreaterThanOrEqual(1);
	expect(violations[0]!.message).toContain('aria-valuenow');
});

test('[require-aria-prop-issue-3682-005] separator with tabindex="-1" still requires aria-valuenow', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="separator" tabindex="-1"></div>');
	expect(violations.length).toBeGreaterThanOrEqual(1);
	expect(violations[0]!.message).toContain('aria-valuenow');
});

test('[require-aria-prop-issue-3682-006] hr with explicit role="separator" is valid (not focusable)', async () => {
	expect((await mlRuleTest(rule, '<hr role="separator">')).violations).toStrictEqual([]);
});

test('[require-aria-prop-issue-3682-007] non-focusable separator is valid pinned to ARIA 1.2', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="separator"></div>', {
		rule: { options: { version: '1.2' } },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-aria-prop-issue-3682-008] focusable separator pinned to ARIA 1.2 reports missing aria-valuenow', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="separator" tabindex="0"></div>', {
		rule: { options: { version: '1.2' } },
	});
	expect(violations.length).toBeGreaterThanOrEqual(1);
	expect(violations.some(v => v.message.includes('aria-valuenow'))).toBe(true);
});

test('[require-aria-prop-issue-3682-009] separator with contenteditable requires aria-valuenow', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="separator" contenteditable>x</div>');
	expect(violations.length).toBeGreaterThanOrEqual(1);
	expect(violations[0]!.message).toContain('aria-valuenow');
});
