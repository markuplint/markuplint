import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };

test('[element-supports-aria-prop-001] element with no element-specific restriction is allowed', async () => {
	expect((await mlRuleTest(rule, '<div aria-pressed="true">y</div>')).violations).toStrictEqual([]);
});

test('[element-supports-aria-prop-002] img with no alt and aria-relevant is reported (properties.only whitelist)', async () => {
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

test('[element-supports-aria-prop-003] br aria-atomic is disallowed (properties.only whitelist)', async () => {
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

test('[element-supports-aria-prop-004] br aria-hidden is allowed (in properties.only whitelist)', async () => {
	// aria-hidden IS in the only-list, so it must pass.
	expect((await mlRuleTest(rule, '<br aria-hidden="true">')).violations).toStrictEqual([]);
});

test('[element-supports-aria-prop-005] wbr aria-atomic is disallowed (same properties.only mechanism)', async () => {
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

// button[popovertarget] must not have aria-expanded. The popover API
// manages the expanded/collapsed state automatically, so a manual aria-expanded
// is redundant and may drift from the actual state.
test('[element-supports-aria-prop-006] button[popovertarget] aria-expanded is must-not', async () => {
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

test('[element-supports-aria-prop-007] button without popovertarget allows aria-expanded', async () => {
	// Sanity check: without popovertarget the conditional must not fire.
	expect((await mlRuleTest(rule, '<button aria-expanded="false">x</button>')).violations).toStrictEqual([]);
});

// button[commandfor] must not have aria-expanded. The Invoker Commands
// API manages the expanded state automatically (same reasoning as popovertarget),
// so a manual aria-expanded is redundant and may drift from the actual state.
test('[element-supports-aria-prop-008] button[commandfor] aria-expanded is must-not', async () => {
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

test('[element-supports-aria-prop-009] button without commandfor allows aria-expanded', async () => {
	// Sanity check: without commandfor the conditional must not fire.
	expect(
		(await mlRuleTest(rule, '<button command="toggle-popover" aria-expanded="false">x</button>')).violations,
	).toStrictEqual([]);
});

// input[type=hidden] sets `properties: false` in spec data, meaning
// any aria-* attribute is disallowed. The check must fire even though the
// element has no implicit role and no explicit role (same root cause as the naming
// prohibition on elements without a role, but element-specific rather than naming-specific).
test('[element-supports-aria-prop-010] aria-hidden on input[type=hidden] is disallowed', async () => {
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

test('[element-supports-aria-prop-011] any aria-* on input[type=hidden] is disallowed', async () => {
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

test('[element-supports-aria-prop-012] input[type=text] aria-hidden is allowed (properties not false)', async () => {
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
test('[element-supports-aria-prop-013] aria-expanded on summary in details is must-not', async () => {
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

test('[element-supports-aria-prop-014] aria-pressed on summary in details is must-not', async () => {
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

test('[element-supports-aria-prop-015] aria-disabled on summary in details is allowed', async () => {
	expect(
		(await mlRuleTest(rule, '<details><summary aria-disabled="true">s</summary></details>')).violations,
	).toStrictEqual([]);
});

test('[element-supports-aria-prop-016] aria-haspopup on summary in details is allowed', async () => {
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
test('[element-supports-aria-prop-017] aria-expanded on summary outside details is allowed', async () => {
	expect((await mlRuleTest(rule, '<summary aria-expanded="false">s</summary>')).violations).toStrictEqual([]);
});

test('[element-supports-aria-prop-018] aria-pressed on summary outside details is allowed', async () => {
	expect((await mlRuleTest(rule, '<summary aria-pressed="true">s</summary>')).violations).toStrictEqual([]);
});

// A non-first summary in details is not "the summary" per HTML LS §4.11.2; the
// content-model rule already reports the extra summary, so this rule here
// treats it as the "otherwise" ARIA-in-HTML case (button role's supported
// aria-* remain allowed).
test('[element-supports-aria-prop-019] aria-expanded on non-first summary in details is allowed', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<details><summary>first</summary><summary aria-expanded="false">s</summary></details>',
			)
		).violations,
	).toStrictEqual([]);
});

test('[element-supports-aria-prop-020] an upper-case aria-hidden is in the properties.only whitelist', async () => {
	expect((await mlRuleTest(rule, '<br ARIA-HIDDEN="true">')).violations).toStrictEqual([]);
});

test('[element-supports-aria-prop-021] an upper-case aria-* outside the properties.only whitelist is reported by the spelling written', async () => {
	const { violations } = await mlRuleTest(rule, '<br ARIA-ATOMIC="true">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 5,
			message: 'The "ARIA-ATOMIC" ARIA property is disallowed on the "br" element',
			raw: 'ARIA-ATOMIC="true"',
		},
	]);
});

test('[element-supports-aria-prop-022] an upper-case aria-* is matched with properties.without', async () => {
	const { violations } = await mlRuleTest(rule, '<button popovertarget="p" ARIA-EXPANDED="false">x</button>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 27,
			message:
				'The "ARIA-EXPANDED" ARIA state must not use on the "button" element. As its state is already provided by the "popovertarget" attribute',
			raw: 'ARIA-EXPANDED="false"',
		},
	]);
});

test('[element-supports-aria-prop-023] JSX: an upper-case aria-hidden on an HTML element is in the whitelist', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<br ARIA-HIDDEN="true" />', { parser })).violations).toStrictEqual([]);

	// Control: an aria-* outside the whitelist is reported on the same element
	const { violations } = await mlRuleTest(rule, '<br ARIA-ATOMIC="true" />', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 5,
			message: 'The "ARIA-ATOMIC" ARIA property is disallowed on the "br" element',
			raw: 'ARIA-ATOMIC="true"',
		},
	]);
});

test('[element-supports-aria-prop-024] JSX: an upper-case aria-* on an svg element is not an ARIA attribute', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<svg><circle ARIA-LABEL="x" /></svg>', { parser })).violations).toStrictEqual([]);

	// Control: the lower-case name is reported on the same element (it takes no aria-*)
	const { violations } = await mlRuleTest(rule, '<svg><circle aria-label="x" /></svg>', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 14,
			message: 'The "aria-label" ARIA property is disallowed on the "circle" element',
			raw: 'aria-label="x"',
		},
	]);
});

test('[element-supports-aria-prop-025] JSX: an img named by an aria-labelledby whose value is not known until it is rendered is allowed', async () => {
	const source = '<div><img src="a.svg" aria-labelledby={id} /><p id={id}>Label</p></div>';
	expect((await mlRuleTest(rule, source, jsx)).violations).toStrictEqual([]);
});

test('[element-supports-aria-prop-026] JSX: an img whose aria-labelledby refers to an element of an id that is not known until it is rendered is allowed', async () => {
	const source = '<div><img src="a.svg" aria-labelledby="label" /><p id={id}>Label</p></div>';
	expect((await mlRuleTest(rule, source, jsx)).violations).toStrictEqual([]);
});

test('[element-supports-aria-prop-027] JSX: an aria-labelledby that refers to no element is still reported while every id is known', async () => {
	const source = '<div><img src="a.svg" aria-labelledby="label" /><p id="other">Label</p></div>';
	expect((await mlRuleTest(rule, source, jsx)).violations).toStrictEqual([]);
});

test('[element-supports-aria-prop-028] JSX: an aria-labelledby that the framework does not output gives no name', async () => {
	const source = '<div><img src="a.svg" aria-labelledby={undefined} aria-relevant="all" /><p id={id}>Label</p></div>';
	expect((await mlRuleTest(rule, source, jsx)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 51,
			message: 'The "aria-relevant" ARIA property is disallowed on the "img" element',
			raw: 'aria-relevant="all"',
		},
	]);
});

test('[element-supports-aria-prop-029] Vue: an img named by a bound aria-labelledby is allowed', async () => {
	const vue = { parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } };
	const source = '<template><div><img src="a.svg" :aria-labelledby="id" /><p :id="id">Label</p></div></template>';
	expect((await mlRuleTest(rule, source, vue)).violations).toStrictEqual([]);
});

test('[element-supports-aria-prop-030] Svelte: an img named by a bound aria-labelledby is allowed', async () => {
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };
	const source = '<div><img src="a.svg" aria-labelledby={id} /><p {id}>Label</p></div>';
	expect((await mlRuleTest(rule, source, svelte)).violations).toStrictEqual([]);
});

test('[element-supports-aria-prop-031] an img named by an element that a component renders is allowed', async () => {
	const pretenders = [
		{
			selector: 'Heading',
			as: { element: 'div', contents: [{ element: 'h2', attrs: [{ name: 'id', value: 't' }] }] },
		},
	] as const;
	const code = '<div><img src="a.svg" aria-labelledby="t" /><Heading id="t">Label</Heading></div>';
	expect((await mlRuleTest(rule, code, { ...jsx, pretenders })).violations).toStrictEqual([]);

	// Control: a reference to an element of the markup with no text gives no name
	expect(
		(await mlRuleTest(rule, '<div><img src="a.svg" aria-labelledby="t" /><h2 id="t"></h2></div>', jsx)).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 23,
			message: 'The "aria-labelledby" ARIA property is disallowed on the "img" element',
			raw: 'aria-labelledby="t"',
		},
	]);
});

test('[element-supports-aria-prop-032] an img named by an element whose content is not known is allowed', async () => {
	const pretenders = [{ selector: 'Dyn', as: { element: 'span', contents: [{ dynamic: true }] } }] as const;
	const code = '<div><img src="a.svg" aria-labelledby="t" /><p id="t"><Dyn /></p></div>';
	expect((await mlRuleTest(rule, code, { ...jsx, pretenders })).violations).toStrictEqual([]);

	// Control: content that the name computation does not read gives no name
	const hidden =
		'<div><img src="a.svg" aria-labelledby="t" /><p id="t"><span aria-hidden="true"><Dyn /></span></p></div>';
	expect((await mlRuleTest(rule, hidden, { ...jsx, pretenders })).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 23,
			message: 'The "aria-labelledby" ARIA property is disallowed on the "img" element',
			raw: 'aria-labelledby="t"',
		},
	]);
});
