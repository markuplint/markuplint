import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[element-supports-aria-prop-valid-001] element with no element-specific restriction is allowed', async () => {
	expect((await mlRuleTest(rule, '<div aria-pressed="true">y</div>')).violations).toStrictEqual([]);
});

test('[element-supports-aria-prop-issue-3630-005] img with no alt and aria-relevant is reported (properties.only whitelist)', async () => {
	// Mirrors html-aria/misc/img-aria-relevant-no-alt-novalid.html
	// spec.img.jsonc's `:not([alt]):aria(has no name)` condition declares
	// `properties: { only: ["aria-hidden"] }` for an img with no alt attribute
	// at all, so any other aria-* attribute — including aria-relevant, which is
	// otherwise restricted to live-region roles — is rejected here rather than
	// by the role-derived check.
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

test('[element-supports-aria-prop-issue-3630-001] br aria-atomic is disallowed (properties.only whitelist)', async () => {
	// Mirrors html-aria/misc/br-aria-atomic-novalid.html
	// spec.br.jsonc declares `properties: { only: ["aria-hidden"] }`. Any other
	// aria-* attribute is rejected by the properties.only branch.
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

test('[element-supports-aria-prop-issue-3630-002] br aria-hidden is allowed (in properties.only whitelist)', async () => {
	// aria-hidden IS in the only-list, so it must pass.
	expect((await mlRuleTest(rule, '<br aria-hidden="true">')).violations).toStrictEqual([]);
});

test('[element-supports-aria-prop-issue-3630-003] wbr aria-atomic is disallowed (same properties.only mechanism)', async () => {
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

// #3735 P1: button[popovertarget] must not have aria-expanded. The popover API
// manages the expanded/collapsed state automatically, so a manual aria-expanded
// is redundant and may drift from the actual state.
test('[element-supports-aria-prop-issue-3735-001] button[popovertarget] aria-expanded is must-not', async () => {
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

test('[element-supports-aria-prop-issue-3735-002] button without popovertarget allows aria-expanded', async () => {
	// Sanity check: without popovertarget the conditional must not fire.
	expect((await mlRuleTest(rule, '<button aria-expanded="false">x</button>')).violations).toStrictEqual([]);
});

// #3830: button[commandfor] must not have aria-expanded. The Invoker Commands
// API manages the expanded state automatically (same reasoning as popovertarget),
// so a manual aria-expanded is redundant and may drift from the actual state.
test('[element-supports-aria-prop-issue-3830-001] button[commandfor] aria-expanded is must-not', async () => {
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

test('[element-supports-aria-prop-issue-3830-002] button without commandfor allows aria-expanded', async () => {
	// Sanity check: without commandfor the conditional must not fire.
	expect(
		(await mlRuleTest(rule, '<button command="toggle-popover" aria-expanded="false">x</button>')).violations,
	).toStrictEqual([]);
});

// #3735 P2: input[type=hidden] sets `properties: false` in spec data, meaning
// any aria-* attribute is disallowed. The check must fire even though the
// element has no implicit role and no explicit role (same root cause as #3630
// naming prohibition, but element-specific rather than naming-specific).
test('[element-supports-aria-prop-issue-3735-003] aria-hidden on input[type=hidden] is disallowed', async () => {
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

test('[element-supports-aria-prop-issue-3735-004] any aria-* on input[type=hidden] is disallowed', async () => {
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

test('[element-supports-aria-prop-issue-3735-005] input[type=text] aria-hidden is allowed (properties not false)', async () => {
	// Sanity check: properties=false is specific to type=hidden. type=text has
	// implicitRole=textbox and supports global aria-* attrs including aria-hidden.
	expect((await mlRuleTest(rule, '<input type="text" aria-hidden="true">')).violations).toStrictEqual([]);
});

// ARIA in HTML restricts a summary that is a summary for its parent details
// element to "Global aria-* attributes, aria-disabled, and aria-haspopup
// attributes". aria-expanded and aria-pressed conflict with the details.open
// state exposed by the native semantics and must not be used, even though
// markuplint presets summary's implicit role as button.
// https://w3c.github.io/html-aria/#el-summary
test('[element-supports-aria-prop-invalid-001] aria-expanded on summary in details is must-not', async () => {
	const { violations } = await mlRuleTest(rule, '<details><summary aria-expanded="false">s</summary></details>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 19,
			message: 'The "aria-expanded" ARIA state must not use on the "summary" element',
			raw: 'aria-expanded="false"',
		},
	]);
});

test('[element-supports-aria-prop-invalid-002] aria-pressed on summary in details is must-not', async () => {
	const { violations } = await mlRuleTest(rule, '<details><summary aria-pressed="true">s</summary></details>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 19,
			message: 'The "aria-pressed" ARIA state must not use on the "summary" element',
			raw: 'aria-pressed="true"',
		},
	]);
});

test('[element-supports-aria-prop-valid-002] aria-disabled on summary in details is allowed', async () => {
	expect(
		(await mlRuleTest(rule, '<details><summary aria-disabled="true">s</summary></details>')).violations,
	).toStrictEqual([]);
});

test('[element-supports-aria-prop-valid-003] aria-haspopup on summary in details is allowed', async () => {
	expect(
		(await mlRuleTest(rule, '<details><summary aria-haspopup="true">s</summary></details>')).violations,
	).toStrictEqual([]);
});

// ARIA in HTML: "otherwise, if the summary element is not a summary for its
// parent details element, authors MAY specify any role, and any global aria-*
// attributes and any aria-* attributes applicable to the allowed roles."
// The must-not is scoped via spec.summary.jsonc conditions to the first
// summary child of details, so a summary outside details keeps button role's
// supported aria-* including aria-expanded and aria-pressed.
test('[element-supports-aria-prop-valid-004] aria-expanded on summary outside details is allowed', async () => {
	expect((await mlRuleTest(rule, '<summary aria-expanded="false">s</summary>')).violations).toStrictEqual([]);
});

test('[element-supports-aria-prop-valid-005] aria-pressed on summary outside details is allowed', async () => {
	expect((await mlRuleTest(rule, '<summary aria-pressed="true">s</summary>')).violations).toStrictEqual([]);
});

// A non-first summary in details is not "the summary" per HTML LS §4.11.2; the
// content-model rule already reports the extra summary, so this rule here
// treats it as the "otherwise" ARIA-in-HTML case (button role's supported
// aria-* remain allowed).
test('[element-supports-aria-prop-valid-006] aria-expanded on non-first summary in details is allowed', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<details><summary>first</summary><summary aria-expanded="false">s</summary></details>',
			)
		).violations,
	).toStrictEqual([]);
});
