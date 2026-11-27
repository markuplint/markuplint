import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

test('[permitted-roles-001] permitted role', async () => {
	expect((await mlRuleTest(rule, '<a href="path/to" role="button">text</a>')).violations).toStrictEqual([]);
});

test('[permitted-roles-002] non-permitted role on select', async () => {
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

// <img alt=""> must not have any role attribute — including role="none" / "presentation"
// which match the implicit role. Per ARIA in HTML §3.4, "No role permitted".
test('[permitted-roles-003] img with alt="" must not have role=presentation', async () => {
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

test('[permitted-roles-004] img with alt="" must not have role=none', async () => {
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

test('[permitted-roles-005] img with alt="" must not have role=img', async () => {
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

// Explicit non-presentational role on <img alt="">
test('[permitted-roles-006] img with alt="" must not have role=button', async () => {
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

test('[permitted-roles-007] img with alt="" must not have role=link', async () => {
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

// <img> without alt and without accessible name still forbids explicit role
test('[permitted-roles-008] img without alt must not have role=presentation', async () => {
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

test('[permitted-roles-009] img with alt="" and no role attribute is valid', async () => {
	expect((await mlRuleTest(rule, '<img src="x.png" alt="">')).violations).toStrictEqual([]);
});

// Positive regression: role must still be permitted when alt provides an accessible name.
test('[permitted-roles-010] img with alt text and permitted role is valid', async () => {
	expect((await mlRuleTest(rule, '<img src="x.png" alt="photo" role="button">')).violations).toStrictEqual([]);
});

// Positive regression: aria-label provides accname → conditional :not([alt]):aria(has no name)
// does NOT match, so top-level permittedRoles list applies and role="img" is allowed.
test('[permitted-roles-011] img with aria-label and role=img is valid', async () => {
	expect((await mlRuleTest(rule, '<img src="x.png" aria-label="foo" role="img">')).violations).toStrictEqual([]);
});

// Regression pin: <summary> sets permittedRoles=false in html-spec, so
// any explicit role is rejected — including the implicit "button" role. Pin
// this so future spec updates do not silently start permitting role on summary.
test('[permitted-roles-012] role=button on summary inside details is rejected', async () => {
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

test('[permitted-roles-013] non-implicit role on summary is also rejected', async () => {
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

test('[permitted-roles-014] HTML→HTML pretender no-ops: original h1 role restriction still fires', async () => {
	// A `pretenders` config with an HTML element selector is ignored,
	// so `<h1 role="button">` is checked against h1's permitted roles even when the
	// user attempted to mask it with `as: 'div'`.
	const { violations } = await mlRuleTest(rule, '<h1 role="button">x</h1>', {
		pretenders: [{ selector: 'h1', as: 'div' }],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 11,
			message: 'Cannot overwrite the "button" role to the "h1" element according to ARIA in HTML specification',
			raw: 'button',
		},
	]);
});

describe('a role that code gives in JSX', () => {
	const parser = { '.*': '@markuplint/jsx-parser' };

	test('[permitted-roles-015] JSX: the tokens of a role that code gives are not the roles that the element has', async () => {
		const source = [
			'<>',
			'<img role={props.role} src="a.png" alt="" />',
			'<img role="button" src="a.png" alt="" {...props} />',
			'</>',
		].join('\n');
		expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);

		// Control: the role that the markup tells is judged, also where a spread attribute is before it
		const message =
			'Cannot overwrite the "button" role to the "img" element according to ARIA in HTML specification';
		expect(
			(await mlRuleTest(rule, '<img role="button" src="a.png" alt="" />', { parser })).violations,
		).toStrictEqual([{ severity: 'error', line: 1, col: 12, message, raw: 'button' }]);
		expect(
			(await mlRuleTest(rule, '<img {...props} role="button" src="a.png" alt="" />', { parser })).violations,
		).toStrictEqual([{ severity: 'error', line: 1, col: 23, message, raw: 'button' }]);
	});

	test('[permitted-roles-016] JSX: a literal that is written as code is a role that the markup tells', async () => {
		const { violations } = await mlRuleTest(rule, '<img role={"button"} src="a.png" alt="" />', { parser });
		expect(violations.map(v => v.message)).toStrictEqual([
			'Cannot overwrite the "button" role to the "img" element according to ARIA in HTML specification',
		]);
	});
});

test('[permitted-roles-017] of two `role` attributes, the one that the element has is checked', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<a href="#" role="tab" role="img" />', { parser })).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 30,
			message: 'Cannot overwrite the "img" role to the "a" element according to ARIA in HTML specification',
			raw: 'img',
		},
	]);
	// The later `role` is the role in JSX, and the first in the HTML syntax
	expect((await mlRuleTest(rule, '<a href="#" role="img" role="tab" />', { parser })).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<a href="#" role="img" role="tab"></a>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 19,
			message: 'Cannot overwrite the "img" role to the "a" element according to ARIA in HTML specification',
			raw: 'img',
		},
	]);
});
