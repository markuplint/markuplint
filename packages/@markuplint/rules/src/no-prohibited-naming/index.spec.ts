import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-prohibited-naming-valid-001] non-naming-prohibited element with aria-label is allowed', async () => {
	expect((await mlRuleTest(rule, '<div aria-label="x">y</div>')).violations).toStrictEqual([]);
});

// #3630: naming prohibition on elements without role
test('[no-prohibited-naming-issue-3630-001] aria-label on cite is prohibited', async () => {
	const { violations } = await mlRuleTest(rule, '<cite aria-label="x">y</cite>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 7,
			message: 'The "aria-label" ARIA property is prohibited on the "cite" element',
			raw: 'aria-label="x"',
		},
	]);
});

test('[no-prohibited-naming-issue-3630-002] aria-labelledby on abbr is prohibited', async () => {
	const { violations } = await mlRuleTest(rule, '<abbr aria-labelledby="x">y</abbr>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 7,
			message: 'The "aria-labelledby" ARIA property is prohibited on the "abbr" element',
			raw: 'aria-labelledby="x"',
		},
	]);
});

test('[no-prohibited-naming-issue-3630-003] aria-braillelabel on figcaption is prohibited', async () => {
	const { violations } = await mlRuleTest(rule, '<figcaption aria-braillelabel="x">y</figcaption>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 13,
			message: 'The "aria-braillelabel" ARIA property is prohibited on the "figcaption" element',
			raw: 'aria-braillelabel="x"',
		},
	]);
});

test('[no-prohibited-naming-issue-3630-004] aria-label on cite with explicit role is allowed', async () => {
	// When an explicit role that supports naming is set, prohibition does not apply
	expect((await mlRuleTest(rule, '<cite role="button" aria-label="x">y</cite>')).violations).toStrictEqual([]);
});

test('[no-prohibited-naming-issue-3630-005] aria-hidden on cite is allowed (not a naming attribute)', async () => {
	// aria-hidden is not a naming attribute; naming prohibition does not affect it
	expect((await mlRuleTest(rule, '<cite aria-hidden="true">y</cite>')).violations).toStrictEqual([]);
});

// All 9 elements with implicitRole=false + namingProhibited=true should be
// detected consistently. Confirms the spec-data assumption holds across elements.
test('[no-prohibited-naming-issue-3630-006] all namingProhibited elements detect aria-label', async () => {
	for (const el of ['abbr', 'cite', 'figcaption', 'kbd', 'label', 'legend', 'mark', 'rt', 'var']) {
		const { violations } = await mlRuleTest(rule, `<${el} aria-label="x">y</${el}>`);
		expect(violations, `element: ${el}`).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: el.length + 3,
				message: `The "aria-label" ARIA property is prohibited on the "${el}" element`,
				raw: 'aria-label="x"',
			},
		]);
	}
});

test('[no-prohibited-naming-issue-3630-007] label with aria-label is prohibited (no role)', async () => {
	// <label> has labelable-element semantics but no implicit ARIA role;
	// naming prohibition applies the same way as other 8 elements
	const { violations } = await mlRuleTest(rule, '<label aria-label="x">text</label>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 8,
			message: 'The "aria-label" ARIA property is prohibited on the "label" element',
			raw: 'aria-label="x"',
		},
	]);
});

test('[no-prohibited-naming-issue-3630-008] cite with invalid role attribute still prohibited', async () => {
	// Invalid role → computed role falls back to null (cite has no implicit role)
	// → naming prohibition still applies
	const { violations } = await mlRuleTest(rule, '<cite role="invalid-role" aria-label="x">y</cite>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 27,
			message: 'The "aria-label" ARIA property is prohibited on the "cite" element',
			raw: 'aria-label="x"',
		},
	]);
});

test('[no-prohibited-naming-issue-3630-009] cite with empty role attribute still prohibited', async () => {
	// Empty role value → treated as no role → naming prohibition still applies
	const { violations } = await mlRuleTest(rule, '<cite role="" aria-label="x">y</cite>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 15,
			message: 'The "aria-label" ARIA property is prohibited on the "cite" element',
			raw: 'aria-label="x"',
		},
	]);
});

test('[no-prohibited-naming-issue-3630-010] autonomous custom element with aria-label is prohibited', async () => {
	// Mirrors html-aria/misc/aria-label-autonomous-custom-element-novalid.html
	// Per ARIA in HTML §4.4 / §6.4, autonomous custom elements have no implicit role.
	// Naming attrs (aria-label / aria-labelledby / aria-braillelabel) are prohibited
	// unless the author assigns an explicit role that supports naming. nu-validator
	// fires on this; markuplint now mirrors that policy.
	const { violations } = await mlRuleTest(rule, '<my-widget aria-label="x">y</my-widget>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 12,
			message: 'The "aria-label" ARIA property is prohibited on the "my-widget" element',
			raw: 'aria-label="x"',
		},
	]);
});

test('[no-prohibited-naming-issue-3630-011] autonomous custom element with role + aria-label is allowed', async () => {
	// Mirrors html-aria/misc/aria-label-autonomous-custom-element-novalid.html (positive case)
	// Setting an explicit role that supports naming lifts the prohibition.
	const { violations } = await mlRuleTest(rule, '<my-widget role="button" aria-label="x">y</my-widget>');
	expect(violations).toStrictEqual([]);
});

test('[no-prohibited-naming-issue-3630-012] autonomous custom element with non-naming aria attr is allowed', async () => {
	// aria-hidden is not a naming attribute; the prohibition does not apply.
	expect((await mlRuleTest(rule, '<my-widget aria-hidden="true">y</my-widget>')).violations).toStrictEqual([]);
});

test('[no-prohibited-naming-issue-3630-013] custom element role="presentation" + aria-label currently allowed', async () => {
	// `getComputedRole` cannot validate `role=` on unknown elements, so the
	// branch reads the raw attribute and treats any non-empty value as "an
	// explicit role is set". This is permissive — `role="presentation"` /
	// `role="none"` do not actually support naming, but the rule does not
	// reject the combination today. Pin the permissive behaviour explicitly
	// so a future tightening (e.g. validating against namingProhibited roles)
	// surfaces with a clear test failure.
	const { violations } = await mlRuleTest(rule, '<my-widget role="presentation" aria-label="x">y</my-widget>');
	expect(violations).toStrictEqual([]);
});

test('[no-prohibited-naming-issue-3630-014] customised-built-in (`<button is="x-y">`) is unaffected', async () => {
	// `is=` makes the element a customised built-in; the spec.<el>.jsonc path
	// drives the check (here: `<button>` supports aria-label). The
	// autonomous-custom-element branch must skip this case.
	expect((await mlRuleTest(rule, '<button is="x-y" aria-label="x">y</button>')).violations).toStrictEqual([]);
});

test('[no-prohibited-naming-issue-3630-015] custom element + non-naming aria does NOT double-fire with aria-prop-requires-role', async () => {
	// Boundary check: no-prohibited-naming handles autonomous custom elements
	// only for naming attrs. Non-naming aria-* on a custom element without role
	// goes to neither rule (aria-prop-requires-role early-returns when no
	// spec.<el>.jsonc entry exists). Pin this so a future expansion of either
	// rule's web-component coverage surfaces the responsibility split.
	const { mlTest } = await import('markuplint');
	const r = await mlTest('<my-widget aria-controls="x">y</my-widget>', {
		rules: {
			'no-prohibited-naming': true,
			'aria-prop-requires-role': true,
		},
	});
	expect(r.violations).toStrictEqual([]);
});
