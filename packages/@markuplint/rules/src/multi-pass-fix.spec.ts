import { mlTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

describe('multi-pass fix', () => {
	test('[multi-pass-fix-fix-001] no overlap (single pass resolves all)', async () => {
		const { fixedCode } = await mlTest(
			"<DIV CLASS='a'></DIV>",
			{
				rules: {
					'case-sensitive-tag-name': true,
					'attr-value-quotes': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<div CLASS="a"></div>');
	});

	test('[multi-pass-fix-fix-002] overlap resolved in multi-pass', async () => {
		const { fixedCode } = await mlTest(
			"<DIV DATA-FOO='val'></DIV>",
			{
				rules: {
					'case-sensitive-tag-name': true,
					'case-sensitive-attr-name': true,
					'attr-value-quotes': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<div data-foo="val"></div>');
	});

	test('[multi-pass-fix-fix-003] fix produces no changes on valid code', async () => {
		const { fixedCode } = await mlTest(
			'<div></div>',
			{
				rules: {
					'case-sensitive-tag-name': true,
					'case-sensitive-attr-name': true,
					'attr-value-quotes': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<div></div>');
	});

	test('[multi-pass-fix-fix-004] 5+ rules applied together (overlap only, no cascading)', async () => {
		const { fixedCode } = await mlTest(
			"<DIV CLASS='a' CLASS='b' DATA-FOO='val'></DIV>",
			{
				rules: {
					'case-sensitive-tag-name': true,
					'case-sensitive-attr-name': true,
					'attr-value-quotes': true,
					'attr-duplication': true,
				},
			},
			undefined,
			'en',
			true,
		);
		// Tag name lowered, attr names lowered, quotes normalized, duplicate removed
		expect(fixedCode).toBe('<div class="a" data-foo="val"></div>');
	});
});

describe('multi-pass fix with parsers', () => {
	test('[multi-pass-fix-fix-005] Pug: attr-value-quotes + no-boolean-attr-value', async () => {
		const { fixedCode } = await mlTest(
			"input(disabled='disabled' type='text')",
			{
				parser: { '.*': '@markuplint/pug-parser' },
				rules: {
					'attr-value-quotes': { severity: 'error', value: 'double' },
					'no-boolean-attr-value': true,
				},
			},
			undefined,
			'en',
			true,
		);
		// disabled='disabled' → disabled (boolean fix), type='text' → type="text" (quote fix)
		expect(fixedCode).toBe('input(disabled type="text")');
	});

	test('[multi-pass-fix-fix-006] Pug: attr-value-quotes + no-default-value', async () => {
		const { fixedCode } = await mlTest(
			"input(type='text' placeholder='enter')",
			{
				parser: { '.*': '@markuplint/pug-parser' },
				rules: {
					'attr-value-quotes': { severity: 'error', value: 'double' },
					'no-default-value': true,
				},
			},
			undefined,
			'en',
			true,
		);
		// type='text' → removed (default value), placeholder='enter' → placeholder="enter" (quote fix)
		// Leading space remains after attribute removal in Pug bracket syntax
		expect(fixedCode).toBe('input( placeholder="enter")');
	});

	test('[multi-pass-fix-fix-007] Vue: attr-value-quotes + no-boolean-attr-value', async () => {
		const { fixedCode } = await mlTest(
			"<template><input disabled='disabled' data-foo='bar' /></template>",
			{
				parser: { '.*': '@markuplint/vue-parser' },
				rules: {
					'attr-value-quotes': { severity: 'error', value: 'double' },
					'no-boolean-attr-value': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<template><input disabled data-foo="bar" /></template>');
	});

	test('[multi-pass-fix-fix-008] Vue: attr-value-quotes + attr-duplication', async () => {
		const { fixedCode } = await mlTest(
			"<template><div class='a' class='b'></div></template>",
			{
				parser: { '.*': '@markuplint/vue-parser' },
				rules: {
					'attr-value-quotes': { severity: 'error', value: 'double' },
					'attr-duplication': true,
				},
			},
			undefined,
			'en',
			true,
		);
		// Duplicate removed + quotes normalized
		expect(fixedCode).toBe('<template><div class="a"></div></template>');
	});

	test('[multi-pass-fix-fix-009] JSX: no-boolean-attr-value on element with multiple attrs', async () => {
		const { fixedCode } = await mlTest(
			'<><input disabled="disabled" required="required" /></>',
			{
				parser: { '.*': '@markuplint/jsx-parser' },
				rules: {
					'no-boolean-attr-value': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<><input disabled required /></>');
	});

	test('[multi-pass-fix-fix-010] Markdown: attr-value-quotes + no-boolean-attr-value on raw HTML', async () => {
		const { fixedCode } = await mlTest(
			"Some text\n\n<input disabled='disabled' data-foo='bar' />\n",
			{
				parser: { '.*': '@markuplint/markdown-parser' },
				rules: {
					'attr-value-quotes': { severity: 'error', value: 'double' },
					'no-boolean-attr-value': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('Some text\n\n<input disabled data-foo="bar" />\n');
	});
});
