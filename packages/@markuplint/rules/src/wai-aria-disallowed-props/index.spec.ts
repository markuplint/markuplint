import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[wai-aria-disallowed-props-valid-001] allowed prop on role', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[wai-aria-disallowed-props-invalid-001] disallowed prop on role', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="heading" aria-pressed="true"></div>');
	expect(violations.length).toBe(1);
	expect(violations[0]!.severity).toBe('error');
});

// #3630: naming prohibition on elements without role
test('[wai-aria-disallowed-props-issue-3630-001] aria-label on cite is prohibited', async () => {
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

test('[wai-aria-disallowed-props-issue-3630-002] aria-labelledby on abbr is prohibited', async () => {
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

test('[wai-aria-disallowed-props-issue-3630-003] aria-braillelabel on figcaption is prohibited', async () => {
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

test('[wai-aria-disallowed-props-issue-3630-004] aria-label on cite with explicit role is allowed', async () => {
	// When an explicit role that supports naming is set, prohibition does not apply
	expect((await mlRuleTest(rule, '<cite role="button" aria-label="x">y</cite>')).violations).toStrictEqual([]);
});

test('[wai-aria-disallowed-props-issue-3630-005] aria-hidden on cite is allowed (not a naming attribute)', async () => {
	// aria-hidden is not a naming attribute; naming prohibition does not affect it
	expect((await mlRuleTest(rule, '<cite aria-hidden="true">y</cite>')).violations).toStrictEqual([]);
});

// All 9 elements with implicitRole=false + namingProhibited=true should be
// detected consistently. Confirms the spec-data assumption holds across elements.
test('[wai-aria-disallowed-props-issue-3630-006] all namingProhibited elements detect aria-label', async () => {
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

test('[wai-aria-disallowed-props-issue-3630-007] label with aria-label is prohibited (no role)', async () => {
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

test('[wai-aria-disallowed-props-issue-3630-008] cite with invalid role attribute still prohibited', async () => {
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

test('[wai-aria-disallowed-props-issue-3630-009] cite with empty role attribute still prohibited', async () => {
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

test('[wai-aria-disallowed-props-issue-3630-010] autonomous custom element with aria-label is prohibited', async () => {
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

test('[wai-aria-disallowed-props-issue-3630-011] autonomous custom element with role + aria-label is allowed', async () => {
	// Mirrors html-aria/misc/aria-label-autonomous-custom-element-novalid.html (positive case)
	// Setting an explicit role that supports naming lifts the prohibition.
	const { violations } = await mlRuleTest(rule, '<my-widget role="button" aria-label="x">y</my-widget>');
	expect(violations).toStrictEqual([]);
});

test('[wai-aria-disallowed-props-issue-3630-012] autonomous custom element with non-naming aria attr is allowed', async () => {
	// aria-hidden is not a naming attribute; the prohibition does not apply.
	expect((await mlRuleTest(rule, '<my-widget aria-hidden="true">y</my-widget>')).violations).toStrictEqual([]);
});

test('[wai-aria-disallowed-props-issue-3630-013] br aria-atomic is disallowed (properties.only whitelist)', async () => {
	// Mirrors html-aria/misc/br-aria-atomic-novalid.html
	// spec.br.jsonc declares `properties: { only: ["aria-hidden"] }`. Any other
	// aria-* attribute is rejected by the new properties.only branch in
	// checkingDisallowedProp.
	const { violations } = await mlRuleTest(rule, '<br aria-atomic="true">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 5,
			message: 'The "aria-atomic" ARIA property is disallowed on the "br" element',
			raw: 'aria-atomic="true"',
		},
	]);
});

test('[wai-aria-disallowed-props-issue-3630-014] br aria-hidden is allowed (in properties.only whitelist)', async () => {
	// aria-hidden IS in the only-list, so it must pass.
	expect((await mlRuleTest(rule, '<br aria-hidden="true">')).violations).toStrictEqual([]);
});

test('[wai-aria-disallowed-props-issue-3630-015] wbr aria-atomic is disallowed (same properties.only mechanism)', async () => {
	// Mirrors html-aria/misc/wbr-aria-atomic-novalid.html
	const { violations } = await mlRuleTest(rule, '<wbr aria-atomic="true">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "aria-atomic" ARIA property is disallowed on the "wbr" element',
			raw: 'aria-atomic="true"',
		},
	]);
});

test('[wai-aria-disallowed-props-issue-3630-016] custom element role="presentation" + aria-label currently allowed', async () => {
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

test('[wai-aria-disallowed-props-issue-3630-017] customised-built-in (`<button is="x-y">`) is unaffected', async () => {
	// `is=` makes the element a customised built-in; the spec.<el>.jsonc path
	// drives the check (here: `<button>` supports aria-label). The
	// autonomous-custom-element branch must skip this case.
	expect((await mlRuleTest(rule, '<button is="x-y" aria-label="x">y</button>')).violations).toStrictEqual([]);
});

test('[wai-aria-disallowed-props-issue-3630-018] img with no alt and aria-relevant is reported', async () => {
	// Mirrors html-aria/misc/img-aria-relevant-no-alt-novalid.html
	// img without alt has no implicit role; the rule's role-derived check
	// rejects aria-relevant which is restricted to live-region roles.
	const { violations } = await mlRuleTest(rule, '<img src="x.png" aria-relevant="all">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 18,
			message: 'The "aria-relevant" ARIA property is disallowed on the "img" element',
			raw: 'aria-relevant="all"',
		},
	]);
});

test('[wai-aria-disallowed-props-issue-3630-019] custom element + non-naming aria does NOT double-fire with wai-aria-no-global-prop', async () => {
	// Boundary check: wai-aria-disallowed-props handles autonomous custom elements
	// only for naming attrs. Non-naming aria-* on a custom element without role
	// goes to neither rule (wai-aria-no-global-prop early-returns when no
	// spec.<el>.jsonc entry exists). Pin this so a future expansion of either
	// rule's web-component coverage surfaces the responsibility split.
	const { mlTest } = await import('markuplint');
	const r = await mlTest('<my-widget aria-controls="x">y</my-widget>', {
		rules: {
			'wai-aria-disallowed-props': true,
			'wai-aria-no-global-prop': true,
		},
	});
	expect(r.violations).toStrictEqual([]);
});

// #3735 P1: button[popovertarget] must not have aria-expanded. The popover API
// manages the expanded/collapsed state automatically, so a manual aria-expanded
// is redundant and may drift from the actual state.
test('[wai-aria-disallowed-props-issue-3735-001] button[popovertarget] aria-expanded is must-not', async () => {
	const { violations } = await mlRuleTest(rule, '<button popovertarget="p" aria-expanded="false">x</button>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 27,
			message:
				'The "aria-expanded" ARIA state must not use on the "button" element. As its state is already provided by the "popovertarget" attribute',
			raw: 'aria-expanded="false"',
		},
	]);
});

test('[wai-aria-disallowed-props-issue-3735-002] button without popovertarget allows aria-expanded', async () => {
	// Sanity check: without popovertarget the conditional must not fire.
	expect((await mlRuleTest(rule, '<button aria-expanded="false">x</button>')).violations).toStrictEqual([]);
});

// #3830: button[commandfor] must not have aria-expanded. The Invoker Commands
// API manages the expanded state automatically (same reasoning as popovertarget),
// so a manual aria-expanded is redundant and may drift from the actual state.
test('[wai-aria-disallowed-props-issue-3830-001] button[commandfor] aria-expanded is must-not', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<button command="toggle-popover" commandfor="p" aria-expanded="false">x</button>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 49,
			message:
				'The "aria-expanded" ARIA state must not use on the "button" element. As its state is already provided by the "commandfor" attribute',
			raw: 'aria-expanded="false"',
		},
	]);
});

test('[wai-aria-disallowed-props-issue-3830-002] button without commandfor allows aria-expanded', async () => {
	// Sanity check: without commandfor the conditional must not fire.
	expect(
		(await mlRuleTest(rule, '<button command="toggle-popover" aria-expanded="false">x</button>')).violations,
	).toStrictEqual([]);
});

// #3735 P2: input[type=hidden] sets `properties: false` in spec data, meaning
// any aria-* attribute is disallowed. The check must fire even though the
// element has no implicit role and no explicit role (same root cause as #3630
// naming prohibition).
test('[wai-aria-disallowed-props-issue-3735-003] aria-hidden on input[type=hidden] is disallowed', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="hidden" aria-hidden="true">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 22,
			message: 'The "aria-hidden" ARIA state is disallowed on the "input" element',
			raw: 'aria-hidden="true"',
		},
	]);
});

test('[wai-aria-disallowed-props-issue-3735-004] any aria-* on input[type=hidden] is disallowed', async () => {
	// Confirms the rule fires for arbitrary aria-* attrs, not only aria-hidden.
	const { violations } = await mlRuleTest(rule, '<input type="hidden" aria-label="x">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 22,
			message: 'The "aria-label" ARIA property is disallowed on the "input" element',
			raw: 'aria-label="x"',
		},
	]);
});

test('[wai-aria-disallowed-props-issue-3735-005] input[type=text] aria-hidden is allowed (properties not false)', async () => {
	// Sanity check: properties=false is specific to type=hidden. type=text has
	// implicitRole=textbox and supports global aria-* attrs including aria-hidden.
	expect((await mlRuleTest(rule, '<input type="text" aria-hidden="true">')).violations).toStrictEqual([]);
});
