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
	// `<div list="x">` is not a valid target for this rule; `invalid-attr` handles it.
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
	expect(violations.length).toBeGreaterThan(0);
});
