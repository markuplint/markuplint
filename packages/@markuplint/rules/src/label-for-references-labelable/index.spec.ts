import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[label-for-references-labelable-valid-001] for attribute references input element', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="u">Username</label><input type="text" id="u">');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-valid-002] no for attribute on label', async () => {
	const { violations } = await mlRuleTest(rule, '<label>Text<input type="text"></label>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-valid-003] for attribute on non-label element ignored', async () => {
	const { violations } = await mlRuleTest(rule, '<output for="x">x</output><input id="x">');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-valid-004] missing target id is left to no-refer-to-non-existent-id', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="missing">Label</label>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-valid-005] labelable target: button', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="a">a</label><button id="a"></button>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-valid-006] labelable target: input (default type)', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="a">a</label><input id="a">');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-valid-007] labelable target: meter', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="a">a</label><meter id="a" value="0"></meter>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-valid-008] labelable target: output', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="a">a</label><output id="a"></output>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-valid-009] labelable target: progress', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="a">a</label><progress id="a"></progress>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-valid-010] labelable target: select', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="a">a</label><select id="a"><option>x</option></select>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-valid-011] labelable target: textarea', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="a">a</label><textarea id="a"></textarea>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-valid-012] duplicate id, first tree-order element is labelable', async () => {
	// Per HTML LS §4.10.4: "the first such element in tree order is the label element's labeled control".
	// The trailing non-labelable element must NOT trigger the rule.
	const { violations } = await mlRuleTest(
		rule,
		'<input id="x"><div id="x">not labelable</div><label for="x">Label</label>',
	);
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-invalid-001] for attribute references non-labelable element (preceding div)', async () => {
	// Mirrors tests/external/validator/tests/html/elements/label/for-non-form-control-novalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<div id="notaformcontrol">Just a div</div><label for="notaformcontrol">Label for non-form-control</label>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 55,
			message: 'The "for" attribute of the "label" element must reference a labelable element',
			raw: 'notaformcontrol',
		},
	]);
});

test('[label-for-references-labelable-invalid-002] for attribute references non-labelable element (following div)', async () => {
	// Mirrors tests/external/validator/tests/html/elements/label/for-references-non-labelable-novalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<label for="target-1">Label</label><div id="target-1">Not a labelable element</div>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 13,
			message: 'The "for" attribute of the "label" element must reference a labelable element',
			raw: 'target-1',
		},
	]);
});

test('[label-for-references-labelable-invalid-003] for attribute references input[type=hidden]', async () => {
	// HTML LS §4.10.2: input is a labelable element only when its type is not in the Hidden state.
	const { violations } = await mlRuleTest(rule, '<label for="h">Label</label><input type="hidden" id="h">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 13,
			message: 'The "for" attribute of the "label" element must reference a labelable element',
			raw: 'h',
		},
	]);
});

test('[label-for-references-labelable-invalid-004] fires independently for each label sharing a non-labelable target', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="t"></div><label for="t">1</label><label for="t">2</label>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 31,
			message: 'The "for" attribute of the "label" element must reference a labelable element',
			raw: 't',
		},
		{
			severity: 'error',
			line: 1,
			col: 55,
			message: 'The "for" attribute of the "label" element must reference a labelable element',
			raw: 't',
		},
	]);
});

test('[label-for-references-labelable-invalid-005] duplicate id, first tree-order element is non-labelable', async () => {
	// Per HTML LS §4.10.4: "the first such element in tree order is the label element's labeled control".
	// A trailing labelable element does NOT rescue the reference; the div wins by tree order.
	const { violations } = await mlRuleTest(
		rule,
		'<div id="x">not labelable</div><input id="x"><label for="x">Label</label>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 58,
			message: 'The "for" attribute of the "label" element must reference a labelable element',
			raw: 'x',
		},
	]);
});

test('[label-for-references-labelable-invalid-006] input[TYPE="Hidden"] treated as hidden (ASCII case-insensitive)', async () => {
	// Pins the `[type="hidden" i]` selector: a future refactor dropping the `i` flag or switching
	// to case-sensitive matching would let this test catch it.
	const { violations } = await mlRuleTest(rule, '<label for="h">Label</label><input TYPE="Hidden" id="h">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 13,
			message: 'The "for" attribute of the "label" element must reference a labelable element',
			raw: 'h',
		},
	]);
});

test('[label-for-references-labelable-parser-001] Vue dynamic :for binding is skipped', async () => {
	// The `isDynamicValue` guard prevents false positives on framework-parsed attributes whose
	// value is a template expression rather than a static ID reference.
	const { violations } = await mlRuleTest(rule, '<label :for="labelId">x</label><div id="labelId">y</div>', {
		parser: { '.*': '@markuplint/vue-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-parser-002] unresolved JSX pretender label is skipped', async () => {
	// A JSX component named like an HTML tag but without an `as` prop is an unresolved pretender —
	// its localName does not become `label`, so the rule's localName check short-circuits. This
	// test pins that behavior against future changes to pretender resolution or the localName guard.
	const { violations } = await mlRuleTest(
		rule,
		'<div><Label htmlFor="x">Label</Label><div id="x">not labelable</div></div>',
		{
			parser: { '.*': '@markuplint/jsx-parser' },
		},
	);
	expect(violations).toStrictEqual([]);
});
