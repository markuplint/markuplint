import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[input-list-references-datalist-valid-001] list attribute references actual datalist element', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<input type="text" list="colors"><datalist id="colors"><option value="Red"></option></datalist>',
	);
	expect(violations).toStrictEqual([]);
});

test('[input-list-references-datalist-valid-002] no list attribute on input', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text">');
	expect(violations).toStrictEqual([]);
});

test('[input-list-references-datalist-valid-003] list attribute on non-input element ignored', async () => {
	// `<div list="x">` is not a valid target for this rule; `no-unknown-attr` handles it.
	const { violations } = await mlRuleTest(rule, '<div list="anything">x</div>');
	expect(violations).toStrictEqual([]);
});

test('[input-list-references-datalist-valid-004] missing target id is left to no-refer-to-non-existent-id', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" list="missing">');
	expect(violations).toStrictEqual([]);
});

test('[input-list-references-datalist-invalid-001] list attribute references non-datalist element (following div)', async () => {
	// Mirrors tests/external/validator/tests/html/elements/input/list-not-datalist-novalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<input type="text" list="notdatalist"><div id="notdatalist">Not a datalist</div>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 26,
			message: 'The "list" attribute of the "input" element must reference a "datalist" element',
			raw: 'notdatalist',
		},
	]);
});

test('[input-list-references-datalist-invalid-002] list attribute references non-datalist element (preceding div)', async () => {
	// Mirrors tests/external/validator/tests/html/elements/input/list-references-nondatalist-novalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<div id="target-1">Not a datalist</div><input type="text" list="target-1">',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 65,
			message: 'The "list" attribute of the "input" element must reference a "datalist" element',
			raw: 'target-1',
		},
	]);
});

test('[input-list-references-datalist-invalid-003] list attribute references span element', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<input type="text" list="target"><span id="target">not datalist</span>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 26,
			message: 'The "list" attribute of the "input" element must reference a "datalist" element',
			raw: 'target',
		},
	]);
});

test('[input-list-references-datalist-invalid-004] fires independently for each input sharing a non-datalist target', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div id="notdatalist"></div><input type="text" list="notdatalist"><input type="text" list="notdatalist">',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 54,
			message: 'The "list" attribute of the "input" element must reference a "datalist" element',
			raw: 'notdatalist',
		},
		{
			severity: 'error',
			line: 1,
			col: 92,
			message: 'The "list" attribute of the "input" element must reference a "datalist" element',
			raw: 'notdatalist',
		},
	]);
});

test('[input-list-references-datalist-invalid-005] list on input[type=hidden] still requires a datalist target', async () => {
	// HTML LS §4.10.5.2 states the value MUST be a datalist ID whenever the attribute is present.
	// The "list attribute does not apply if type is Hidden, Password, ..." note removes the runtime
	// effect but does not override the value-shape MUST.
	const { violations } = await mlRuleTest(
		rule,
		'<input type="hidden" list="notdatalist"><div id="notdatalist"></div>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 28,
			message: 'The "list" attribute of the "input" element must reference a "datalist" element',
			raw: 'notdatalist',
		},
	]);
});

test('[input-list-references-datalist-valid-005] list on input[type=hidden] pointing at a datalist is accepted', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<input type="hidden" list="colors"><datalist id="colors"><option value="Red"></option></datalist>',
	);
	expect(violations).toStrictEqual([]);
});

test('[input-list-references-datalist-parser-001] Vue dynamic :list binding is skipped', async () => {
	// The `isDynamicValue` guard prevents false positives on framework-parsed attributes whose
	// value is a template expression rather than a static ID reference.
	const { violations } = await mlRuleTest(rule, '<input type="text" :list="listId"><div id="listId">x</div>', {
		parser: { '.*': '@markuplint/vue-parser' },
	});
	expect(violations).toStrictEqual([]);
});
