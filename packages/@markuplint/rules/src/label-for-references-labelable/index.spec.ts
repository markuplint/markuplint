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

test('[label-for-references-labelable-valid-005] all labelable targets accepted', async () => {
	const { violations } = await mlRuleTest(
		rule,
		[
			'<label for="a">a</label><button id="a"></button>',
			'<label for="b">b</label><input id="b">',
			'<label for="c">c</label><meter id="c" value="0"></meter>',
			'<label for="d">d</label><output id="d"></output>',
			'<label for="e">e</label><progress id="e"></progress>',
			'<label for="f">f</label><select id="f"><option>x</option></select>',
			'<label for="g">g</label><textarea id="g"></textarea>',
		].join(''),
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
		'<label for="mydiv">Label</label><div id="mydiv">Not a labelable element</div>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 13,
			message: 'The "for" attribute of the "label" element must reference a labelable element',
			raw: 'mydiv',
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

test('[label-for-references-labelable-parser-001] Vue dynamic :for binding is skipped', async () => {
	// The `isDynamicValue` guard prevents false positives on framework-parsed attributes whose
	// value is a template expression rather than a static ID reference.
	const { violations } = await mlRuleTest(rule, '<label :for="labelId">x</label><div id="labelId">y</div>', {
		parser: { '.*': '@markuplint/vue-parser' },
	});
	expect(violations).toStrictEqual([]);
});
