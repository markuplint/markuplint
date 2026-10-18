import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[placeholder-label-option-invalid-001] Valid placeholder', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<select required>
					<option value="">Placeholder</option>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</select>`,
			)
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(
				rule,
				`<select required multiple>
					<option value="placeholder">Placeholder</option>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</select>`,
			)
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlRuleTest(
				rule,
				`<select required size="2">
					<option value="placeholder">Placeholder</option>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</select>`,
			)
		).violations,
	).toStrictEqual([]);
});

test("[placeholder-label-option-invalid-002] Invalid: first option element's value is not empty", async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<select required>
					<option value="placeholder">Placeholder</option>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</select>`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<select required>',
			message: 'Need the placeholder label option',
		},
	]);

	expect(
		(
			await mlRuleTest(
				rule,
				`<select required size="1">
					<option value="placeholder">Placeholder</option>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</select>`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<select required size="1">',
			message: 'Need the placeholder label option',
		},
	]);
});

test("[placeholder-label-option-invalid-003] Invalid: Invalid: first option element's parent is optgroup", async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<select required>
					<optgroup label="Group">
						<option value="">Placeholder</option>
					</optgroup>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</select>`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<select required>',
			message: 'Need the placeholder label option',
		},
	]);
});

test('[placeholder-label-option-invalid-004] The `as` attribute', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<x-select as="select" required>
					<optgroup label="Group">
						<option value="">Placeholder</option>
					</optgroup>
					<option value="option1">Option 1</option>
					<option value="option2">Option 2</option>
				</x-select>`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<x-select as="select" required>',
			message: 'Need the placeholder label option',
		},
	]);
});

test('[placeholder-label-option-invalid-005] Invalid: empty select without any option', async () => {
	expect((await mlRuleTest(rule, '<select required></select>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<select required>',
			message: 'Need the placeholder label option',
		},
	]);
});

test('[placeholder-label-option-invalid-006] Invalid: required select with only non-option children', async () => {
	expect((await mlRuleTest(rule, '<select required><script></script></select>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<select required>',
			message: 'Need the placeholder label option',
		},
	]);
});

const needPlaceholder = (raw: string) => ({
	severity: 'error',
	line: 1,
	col: 1,
	raw,
	message: 'Need the placeholder label option',
});

// The HTML parser drops a `div` inside a `select` while it builds the tree, so a wrapper can only be written
// in a language that keeps the elements as written, such as JSX.
const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };

// https://html.spec.whatwg.org/multipage/form-elements.html#placeholder-label-option
// > ... and that option element does not have an ancestor optgroup in between itself and the select element ...
test('[placeholder-label-option-invalid-007] Invalid: first option element has an optgroup ancestor, not only an optgroup parent', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<select required><optgroup label="Group"><div><option value="">Placeholder</option></div></optgroup><option value="a">A</option></select>',
				jsx,
			)
		).violations,
	).toStrictEqual([needPlaceholder('<select required>')]);
});

// https://html.spec.whatwg.org/multipage/form-elements.html#attr-option-value
// > The value of an option element is the value of the value content attribute, if there is one, or, if there is not,
// > the result of get HTML-aware text content given this and false.
test('[placeholder-label-option-invalid-008] Invalid: first option element without a value attribute has its text as its value', async () => {
	for (const html of [
		'<select required><option>Choose</option><option>A</option></select>',
		'<select required><option>  Choose   one  </option><option>A</option></select>',
		'<select required><option>&nbsp;</option><option>A</option></select>',
		'<select required><option><b>Choose</b></option><option>A</option></select>',
	]) {
		expect((await mlRuleTest(rule, html)).violations, html).toStrictEqual([needPlaceholder('<select required>')]);
	}
});

// https://html.spec.whatwg.org/multipage/form-elements.html#concept-select-size
// > If applying those rules to the attribute's value is not successful, or if the size attribute is absent, then the element's
// > display size is 4 if the element's multiple content attribute is present, and 1 otherwise.
test('[placeholder-label-option-invalid-009] Invalid: a size that parses to 1, or does not parse, is a display size of 1', async () => {
	for (const size of ['01', '+1', ' 1 ', '1abc', '', 'abc', '-1', '1.5']) {
		const html = `<select required size="${size}"><option value="a">A</option></select>`;
		expect((await mlRuleTest(rule, html)).violations, html).toStrictEqual([
			needPlaceholder(`<select required size="${size}">`),
		]);
	}
});

// U+00A0, a no-break space, is not ASCII whitespace, so it stays in the value: the option is not empty.
const NBSP = String.fromCodePoint(160);

test('[placeholder-label-option-invalid-010] Invalid: a no-break space is text, not whitespace to strip', async () => {
	expect(
		(await mlRuleTest(rule, `<select required><option>${NBSP}</option><option>A</option></select>`)).violations,
	).toStrictEqual([needPlaceholder('<select required>')]);
});

test('[placeholder-label-option-valid-001] Valid: a first option element whose value is the empty string', async () => {
	for (const html of [
		'<select required><option></option><option>A</option></select>',
		'<select required><option> </option><option>A</option></select>',
		'<select required><option>\n\t</option><option>A</option></select>',
		'<select required><option value>Placeholder</option><option>A</option></select>',
		'<select required><option value="">Placeholder</option><option>A</option></select>',
		'<select required><option>&#32;</option><option>A</option></select>',
	]) {
		expect((await mlRuleTest(rule, html)).violations, html).toStrictEqual([]);
	}
});

// https://html.spec.whatwg.org/multipage/form-elements.html#concept-select-option-list
test('[placeholder-label-option-valid-002] Valid: the first option element is found through wrappers and past what the list of options skips', async () => {
	for (const html of [
		'<select required><div><option value="">Placeholder</option></div><option>A</option></select>',
		'<select required><hr /><option value="">Placeholder</option></select>',
		'<select required><datalist><option value="x">x</option></datalist><option value="">Placeholder</option></select>',
		'<select required><select><option value="x">x</option></select><option value="">Placeholder</option></select>',
		'<select required><optgroup label="G"><optgroup label="H"><option value="x">x</option></optgroup></optgroup><option value="">P</option></select>',
	]) {
		expect((await mlRuleTest(rule, html, jsx)).violations, html).toStrictEqual([]);
	}
});

test('[placeholder-label-option-valid-003] Valid: a display size other than 1 needs no placeholder label option', async () => {
	for (const size of ['0', '2', '3abc', ' 4']) {
		const html = `<select required size="${size}"><option value="a">A</option></select>`;
		expect((await mlRuleTest(rule, html)).violations, html).toStrictEqual([]);
	}
});

test('[placeholder-label-option-parser-001] Vue: an option whose text is an interpolation is not known to be non-empty', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<template><select required><option>{{ label }}</option><option value="a">A</option></select></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: {
				'.*': '@markuplint/vue-spec',
			},
		},
	);
	expect(violations).toStrictEqual([]);
});

test('[placeholder-label-option-parser-002] Vue and JSX: a size that is an expression is not known to be 1', async () => {
	const viaVue = await mlRuleTest(
		rule,
		'<template><select required :size="n"><option value="a">A</option></select></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: {
				'.*': '@markuplint/vue-spec',
			},
		},
	);
	expect(viaVue.violations).toStrictEqual([]);
	const viaJsx = await mlRuleTest(rule, '<select required size={n}><option value="a">A</option></select>', jsx);
	expect(viaJsx.violations).toStrictEqual([]);
});

test('[placeholder-label-option-parser-003] Vue and JSX: a value that is an expression is not known to be non-empty', async () => {
	const viaVue = await mlRuleTest(
		rule,
		'<template><select required><option :value="v">A</option><option value="b">B</option></select></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: {
				'.*': '@markuplint/vue-spec',
			},
		},
	);
	expect(viaVue.violations).toStrictEqual([]);
	const viaJsx = await mlRuleTest(
		rule,
		'<select required><option value={v}>A</option><option value="b">B</option></select>',
		jsx,
	);
	expect(viaJsx.violations).toStrictEqual([]);
});
