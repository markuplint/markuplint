import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

test('[no-boolean-attr-value-invalid-001] input[required]', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<input type="text" required /><input type="text" required="required" />',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 58,
			message: 'The "required" attribute is a boolean attribute. It doesn\'t need the value',
			raw: '="required"',
		},
	]);
});

test('[no-boolean-attr-value-valid-001] input[disabled] (Mutable)', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<><input type="text" disabled /><input type="text" disabled={disabled} /></>',
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
		},
	);

	expect(violations).toStrictEqual([]);
});

test('[no-boolean-attr-value-valid-002] Updated the hidden attribute type to Enum form Boolean', async () => {
	expect((await mlRuleTest(rule, '<div hidden></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden=""></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="hidden"></div>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<div hidden="until-found"></div>')).violations.length).toBe(0);
});

test('[no-boolean-attr-value-invalid-002] The `as` attribute', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<x-input as="input" type="text" required /><x-input as="input" type="text" required="required" />',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 84,
			message: 'The "required" attribute is a boolean attribute. It doesn\'t need the value',
			raw: '="required"',
		},
	]);
});

describe('fix', () => {
	test('[no-boolean-attr-value-fix-001] remove value from boolean attribute', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<input type="text" required="required" />', undefined, true);
		expect(fixedCode).toBe('<input type="text" required />');
	});

	test('[no-boolean-attr-value-fix-002] multiple boolean attributes', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<input disabled="disabled" required="required" />',
			undefined,
			true,
		);
		expect(fixedCode).toBe('<input disabled required />');
	});

	test('[no-boolean-attr-value-fix-003] spaces around equals', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<input required = "required" />', undefined, true);
		expect(fixedCode).toBe('<input required />');
	});

	test('[no-boolean-attr-value-fix-004] single-quoted value', async () => {
		const { fixedCode } = await mlRuleTest(rule, "<input required='required' />", undefined, true);
		expect(fixedCode).toBe('<input required />');
	});

	test('[no-boolean-attr-value-fix-005] unquoted value', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<input required=required />', undefined, true);
		expect(fixedCode).toBe('<input required />');
	});
});

describe('fix with parsers', () => {
	test('[no-boolean-attr-value-fix-006] fix: Pug is not fixed, its value is code', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'input(disabled="disabled")',
			{ parser: { '.*': '@markuplint/pug-parser' } },
			true,
		);
		expect(fixedCode).toBe('input(disabled="disabled")');
	});

	test('[no-boolean-attr-value-fix-007] fix: JSX remove boolean attr value', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<><input disabled="disabled" /></>',
			{ parser: { '.*': '@markuplint/jsx-parser' } },
			true,
		);
		expect(fixedCode).toBe('<><input disabled /></>');
	});

	test('[no-boolean-attr-value-fix-008] fix: Vue remove boolean attr value', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<template><input disabled="disabled" /></template>',
			{ parser: { '.*': '@markuplint/vue-parser' } },
			true,
		);
		expect(fixedCode).toBe('<template><input disabled /></template>');
	});

	test('[no-boolean-attr-value-fix-009] fix: Markdown raw HTML remove boolean attr value', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'Some text\n\n<input disabled="disabled" />\n',
			{ parser: { '.*': '@markuplint/markdown-parser' } },
			true,
		);
		expect(fixedCode).toBe('Some text\n\n<input disabled />\n');
	});
});

test('[no-boolean-attr-value-issue-4309-001] an upper-case name is the boolean attribute in HTML', async () => {
	const { violations } = await mlRuleTest(rule, '<input REQUIRED="required">');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 16,
			raw: '="required"',
			message: 'The "REQUIRED" attribute is a boolean attribute. It doesn\'t need the value',
		},
	]);
});

test('[no-boolean-attr-value-issue-4309-002] an HTML element in JSX folds the name', async () => {
	const options = { parser: { '.*': '@markuplint/jsx-parser' } };
	const upper = await mlRuleTest(rule, '<input REQUIRED="required" />', options);
	expect(upper.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 16,
			raw: '="required"',
			message: 'The "REQUIRED" attribute is a boolean attribute. It doesn\'t need the value',
		},
	]);
	const lower = await mlRuleTest(rule, '<input required="required" />', options);
	expect(lower.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 16,
			raw: '="required"',
			message: 'The "required" attribute is a boolean attribute. It doesn\'t need the value',
		},
	]);
});

// Attributes that a specification besides the HTML Standard defines, or that the HTML Standard defines for the image
// only (`controls`), were typed `Any` and are `Boolean` now.
test('[no-boolean-attr-value-invalid-003] video: disablepictureinpicture takes no value', async () => {
	// https://w3c.github.io/picture-in-picture/#disable-pip
	const { violations } = await mlRuleTest(rule, '<video disablepictureinpicture="true"></video>');
	expect(violations.map(v => v.raw)).toStrictEqual(['="true"']);
});

test('[no-boolean-attr-value-invalid-004] audio: disableremoteplayback takes no value', async () => {
	// https://w3c.github.io/remote-playback/#the-disableremoteplayback-attribute
	const { violations } = await mlRuleTest(rule, '<audio disableremoteplayback="disableremoteplayback"></audio>');
	expect(violations.map(v => v.raw)).toStrictEqual(['="disableremoteplayback"']);
});

test('[no-boolean-attr-value-invalid-005] input: webkitdirectory takes no value', async () => {
	// https://wicg.github.io/entries-api/#html-forms
	const { violations } = await mlRuleTest(rule, '<input type="file" webkitdirectory="true">');
	expect(violations.map(v => v.raw)).toStrictEqual(['="true"']);
});

test('[no-boolean-attr-value-invalid-006] img: controls takes no value', async () => {
	// https://html.spec.whatwg.org/multipage/embedded-content.html#attr-img-controls
	const { violations } = await mlRuleTest(rule, '<img src="a.png" alt="photo" controls="true">');
	expect(violations.map(v => v.raw)).toStrictEqual(['="true"']);
});

test('[no-boolean-attr-value-issue-4435-001] a boolean that is written as code is not a value of the attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<button disabled={false}></button>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-boolean-attr-value-issue-4435-002] a single expression in quotes of Svelte is an expression', async () => {
	const { violations } = await mlRuleTest(rule, '<button disabled="{false}"></button>', {
		parser: { '.*': '@markuplint/svelte-parser' },
		specs: { '.*': '@markuplint/svelte-spec' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-boolean-attr-value-issue-4435-003] a value that is written is reported as before', async () => {
	const { violations } = await mlRuleTest(rule, '<button disabled="disabled"></button>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 17,
			message: 'The "disabled" attribute is a boolean attribute. It doesn\'t need the value',
			raw: '="disabled"',
		},
	]);
});
