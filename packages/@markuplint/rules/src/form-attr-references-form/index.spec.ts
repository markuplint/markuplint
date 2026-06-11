import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[form-attr-references-form-valid-001] form attribute references actual form element', async () => {
	const { violations } = await mlRuleTest(rule, '<form id="form1"></form><input type="text" form="form1">');
	expect(violations).toStrictEqual([]);
});

test('[form-attr-references-form-valid-002] no form attribute on form-associated element', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text">');
	expect(violations).toStrictEqual([]);
});

test('[form-attr-references-form-valid-003] form attribute on non form-associated element ignored', async () => {
	// `<div form="x">` is not a form-associated element; the attribute is non-conforming
	// per the HTML spec but that is invalid-attr's concern, not this rule's.
	const { violations } = await mlRuleTest(rule, '<div form="anything">x</div>');
	expect(violations).toStrictEqual([]);
});

test('[form-attr-references-form-valid-004] missing target id is left to no-refer-to-non-existent-id', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" form="missing">');
	expect(violations).toStrictEqual([]);
});

test('[form-attr-references-form-invalid-001] form attribute references non-form element', async () => {
	// Mirrors tests/external/validator/tests/html/attributes/form-not-referencing-form-novalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<div id="notaform">Not a form</div><input type="text" form="notaform">',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 61,
			message: 'The "form" attribute on a form-associated element must reference a "form" element',
			raw: 'notaform',
		},
	]);
});

test('[form-attr-references-form-invalid-002] applies to all form-associated elements', async () => {
	const cases = [
		['button', '<div id="x">x</div><button form="x">b</button>'],
		['fieldset', '<div id="x">x</div><fieldset form="x"></fieldset>'],
		['select', '<div id="x">x</div><select form="x"><option>a</option></select>'],
		['textarea', '<div id="x">x</div><textarea form="x"></textarea>'],
		['output', '<div id="x">x</div><output form="x"></output>'],
		['meter', '<div id="x">x</div><meter form="x" value="0.5"></meter>'],
		['progress', '<div id="x">x</div><progress form="x" value="0.5"></progress>'],
	];
	for (const [name, src] of cases) {
		const { violations } = await mlRuleTest(rule, src);
		expect(violations.length, `${name}: should fire`).toBeGreaterThan(0);
	}
});
