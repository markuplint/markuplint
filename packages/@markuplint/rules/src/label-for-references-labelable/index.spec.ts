import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[label-for-references-labelable-001] for attribute references input element', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="u">Username</label><input type="text" id="u">');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-002] no for attribute on label', async () => {
	const { violations } = await mlRuleTest(rule, '<label>Text<input type="text"></label>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-003] for attribute on non-label element ignored', async () => {
	const { violations } = await mlRuleTest(rule, '<output for="x">x</output><input id="x">');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-004] missing target id is left to no-refer-to-non-existent-id', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="missing">Label</label>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-005] labelable target: button', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="a">a</label><button id="a"></button>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-006] labelable target: input (default type)', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="a">a</label><input id="a">');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-007] labelable target: meter', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="a">a</label><meter id="a" value="0"></meter>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-008] labelable target: output', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="a">a</label><output id="a"></output>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-009] labelable target: progress', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="a">a</label><progress id="a"></progress>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-010] labelable target: select', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="a">a</label><select id="a"><option>x</option></select>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-011] labelable target: textarea', async () => {
	const { violations } = await mlRuleTest(rule, '<label for="a">a</label><textarea id="a"></textarea>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-012] duplicate id, first tree-order element is labelable', async () => {
	// Per HTML LS §4.10.4: "the first such element in tree order is the label element's labeled control".
	// The trailing non-labelable element must NOT trigger the rule.
	const { violations } = await mlRuleTest(
		rule,
		'<input id="x"><div id="x">not labelable</div><label for="x">Label</label>',
	);
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-013] for attribute references non-labelable element (preceding div)', async () => {
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

test('[label-for-references-labelable-014] for attribute references non-labelable element (following div)', async () => {
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

test('[label-for-references-labelable-015] for attribute references input[type=hidden]', async () => {
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

test('[label-for-references-labelable-016] fires independently for each label sharing a non-labelable target', async () => {
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

test('[label-for-references-labelable-017] duplicate id, first tree-order element is non-labelable', async () => {
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

test('[label-for-references-labelable-018] input[TYPE="Hidden"] treated as hidden (ASCII case-insensitive)', async () => {
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

test('[label-for-references-labelable-019] Vue dynamic :for binding is skipped', async () => {
	// The `isDynamicValue` guard prevents false positives on framework-parsed attributes whose
	// value is a template expression rather than a static ID reference.
	const { violations } = await mlRuleTest(rule, '<label :for="labelId">x</label><div id="labelId">y</div>', {
		parser: { '.*': '@markuplint/vue-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-020] unresolved JSX pretender label is skipped', async () => {
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

test('[label-for-references-labelable-021] the target is looked for in the tree of the label', async () => {
	const { violations } = await mlRuleTest(rule, '<template><label for="a"></label><div id="a"></div></template>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 23,
			raw: 'a',
			message: 'The "for" attribute of the "label" element must reference a labelable element',
		},
	]);
});

test('[label-for-references-labelable-022] an id in another tree is not the target', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"></div><template><label for="a"></label></template>');
	expect(violations).toStrictEqual([]);
});

test('[label-for-references-labelable-023] the id is compared after the character references are resolved', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="&#97;"></div><label for="a"></label>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 35,
			raw: 'a',
			message: 'The "for" attribute of the "label" element must reference a labelable element',
		},
	]);
});

test('[label-for-references-labelable-024] the message is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="x"></div><label for="x">a</label>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 31,
			message: '「label」要素の「for」属性は、ラベル付け可能な要素を参照するべきです',
			raw: 'x',
		},
	]);
});

test('[label-for-references-labelable-025] the element that a pretender declares is judged by what it is declared as', async () => {
	const options = (element: string) => ({
		parser: { '.*': '@markuplint/jsx-parser' },
		pretenders: [
			{
				selector: 'Field',
				as: { element: 'div', contents: [{ element, attrs: [{ name: 'id', value: 'x' }] }] },
			},
		],
	});
	const source = '<><Field /><label for="x">a</label></>';
	expect((await mlRuleTest(rule, source, options('textarea'))).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, source, options('div'))).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 24,
			message: 'The "for" attribute of the "label" element must reference a labelable element',
			raw: 'x',
		},
	]);
});
