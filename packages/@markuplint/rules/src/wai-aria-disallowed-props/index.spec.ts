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

test('[wai-aria-disallowed-props-issue-3630-010] custom element with aria-label is allowed', async () => {
	// Custom elements are not in the namingProhibited list; no violation.
	expect((await mlRuleTest(rule, '<my-widget aria-label="x">y</my-widget>')).violations).toStrictEqual([]);
});
