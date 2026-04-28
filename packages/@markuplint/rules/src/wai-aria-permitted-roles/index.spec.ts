import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[wai-aria-permitted-roles-valid-001] permitted role', async () => {
	expect((await mlRuleTest(rule, '<a href="path/to" role="button">text</a>')).violations).toStrictEqual([]);
});

test('[wai-aria-permitted-roles-invalid-001] non-permitted role on select', async () => {
	expect((await mlRuleTest(rule, '<select role="textbox"></select>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 15,
			message:
				'Cannot overwrite the "textbox" role to the "select" element according to ARIA in HTML specification',
			raw: 'textbox',
		},
	]);
});

// Issue #3641: <img alt=""> must not have any role attribute — including role="none" / "presentation"
// which match the implicit role. Per ARIA in HTML §3.4, "No role permitted".
test('[wai-aria-permitted-roles-issue-3641-001] img with alt="" must not have role=presentation', async () => {
	expect((await mlRuleTest(rule, '<img src="x.png" alt="" role="presentation">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 31,
			message:
				'Cannot overwrite the "presentation" role to the "img" element according to ARIA in HTML specification',
			raw: 'presentation',
		},
	]);
});

test('[wai-aria-permitted-roles-issue-3641-002] img with alt="" must not have role=none', async () => {
	expect((await mlRuleTest(rule, '<img src="x.png" alt="" role="none">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 31,
			message: 'Cannot overwrite the "none" role to the "img" element according to ARIA in HTML specification',
			raw: 'none',
		},
	]);
});

test('[wai-aria-permitted-roles-issue-3641-003] img with alt="" must not have role=img', async () => {
	expect((await mlRuleTest(rule, '<img src="x.png" alt="" role="img">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 31,
			message: 'Cannot overwrite the "img" role to the "img" element according to ARIA in HTML specification',
			raw: 'img',
		},
	]);
});

// Issue #3641 comment case 4: explicit non-presentational role on <img alt="">
test('[wai-aria-permitted-roles-issue-3641-004] img with alt="" must not have role=button', async () => {
	expect((await mlRuleTest(rule, '<img src="x.png" alt="" role="button">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 31,
			message: 'Cannot overwrite the "button" role to the "img" element according to ARIA in HTML specification',
			raw: 'button',
		},
	]);
});

test('[wai-aria-permitted-roles-issue-3641-005] img with alt="" must not have role=link', async () => {
	expect((await mlRuleTest(rule, '<img src="x.png" alt="" role="link">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 31,
			message: 'Cannot overwrite the "link" role to the "img" element according to ARIA in HTML specification',
			raw: 'link',
		},
	]);
});

// Issue #3641 comment case 7: <img> without alt and without accessible name still forbids explicit role
test('[wai-aria-permitted-roles-issue-3641-006] img without alt must not have role=presentation', async () => {
	expect((await mlRuleTest(rule, '<img src="x.png" role="presentation">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 24,
			message:
				'Cannot overwrite the "presentation" role to the "img" element according to ARIA in HTML specification',
			raw: 'presentation',
		},
	]);
});

test('[wai-aria-permitted-roles-valid-002] img with alt="" and no role attribute is valid', async () => {
	expect((await mlRuleTest(rule, '<img src="x.png" alt="">')).violations).toStrictEqual([]);
});

// Positive regression: role must still be permitted when alt provides an accessible name.
test('[wai-aria-permitted-roles-valid-003] img with alt text and permitted role is valid', async () => {
	expect((await mlRuleTest(rule, '<img src="x.png" alt="photo" role="button">')).violations).toStrictEqual([]);
});

// Positive regression: aria-label provides accname → conditional :not([alt]):aria(has no name)
// does NOT match, so top-level permittedRoles list applies and role="img" is allowed.
test('[wai-aria-permitted-roles-valid-004] img with aria-label and role=img is valid', async () => {
	expect((await mlRuleTest(rule, '<img src="x.png" aria-label="foo" role="img">')).violations).toStrictEqual([]);
});

// #3735 P3 regression: <summary> sets permittedRoles=false in html-spec, so
// any explicit role is rejected — including the implicit "button" role. Pin
// this so future spec updates do not silently start permitting role on summary.
test('[wai-aria-permitted-roles-issue-3735-001] role=button on summary inside details is rejected', async () => {
	const { violations } = await mlRuleTest(rule, '<details><summary role="button">x</summary><p>y</p></details>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 25,
			message:
				'Cannot overwrite the "button" role to the "summary" element according to ARIA in HTML specification',
			raw: 'button',
		},
	]);
});

test('[wai-aria-permitted-roles-issue-3735-002] non-implicit role on summary is also rejected', async () => {
	const { violations } = await mlRuleTest(rule, '<details><summary role="generic">x</summary><p>y</p></details>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 25,
			message:
				'Cannot overwrite the "generic" role to the "summary" element according to ARIA in HTML specification',
			raw: 'generic',
		},
	]);
});
