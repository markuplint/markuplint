import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

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
	test('[no-boolean-attr-value-fix-006] fix: Pug remove boolean attr value', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'input(disabled="disabled")',
			{ parser: { '.*': '@markuplint/pug-parser' } },
			true,
		);
		expect(fixedCode).toBe('input(disabled)');
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
