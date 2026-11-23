import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

describe('verify', () => {
	test('[attr-value-quotes-001] default', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Attribute value must be quoted with double quotation marks',
				line: 2,
				col: 26,
				raw: "data-Attr='db'",
			},
			{
				severity: 'warning',
				message: 'Attribute value must be quoted with double quotation marks',
				line: 2,
				col: 41,
				raw: 'data-attR=tr',
			},
		]);
	});

	test('[attr-value-quotes-002] double', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
			{
				rule: {
					severity: 'error',
					value: 'double',
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Attribute value must be quoted with double quotation marks',
				line: 2,
				col: 26,
				raw: "data-Attr='db'",
			},
			{
				severity: 'error',
				message: 'Attribute value must be quoted with double quotation marks',
				line: 2,
				col: 41,
				raw: 'data-attR=tr',
			},
		]);
	});

	test('[attr-value-quotes-003] single', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
			{
				rule: {
					severity: 'error',
					value: 'single',
				},
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Attribute value must be quoted with single quotation marks',
				line: 2,
				col: 8,
				raw: 'data-attr="value"',
			},
			{
				severity: 'error',
				message: 'Attribute value must be quoted with single quotation marks',
				line: 2,
				col: 41,
				raw: 'data-attR=tr',
			},
		]);
	});

	test('[attr-value-quotes-004] empty', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`
		<div data-attr>
			lorem
			<p>ipsam</p>
		</div>
		`,
		);
		expect(violations.length).toBe(0);
	});
});

describe('fix', () => {
	test('[attr-value-quotes-005] empty', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<div attr noop=noop foo="bar" hoge=\'fuga\'>', undefined, true);
		expect(fixedCode).toEqual('<div attr noop="noop" foo="bar" hoge="fuga">');
	});

	test('[attr-value-quotes-006] empty', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<div attr noop=noop foo="bar" hoge=\'fuga\'>',
			{ rule: 'single' },
			true,
		);
		expect(fixedCode).toEqual("<div attr noop='noop' foo='bar' hoge='fuga'>");
	});
});

describe('fix with parsers', () => {
	test('[attr-value-quotes-007] fix: Pug is not fixed, its value is code', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			"div(class='foo')",
			{ rule: { severity: 'error', value: 'double' }, parser: { '.*': '@markuplint/pug-parser' } },
			true,
		);
		expect(fixedCode).toBe("div(class='foo')");
	});

	test('[attr-value-quotes-008] fix: Vue single → double', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			"<template><div :class='foo'></div></template>",
			{ rule: { severity: 'error', value: 'double' }, parser: { '.*': '@markuplint/vue-parser' } },
			true,
		);
		expect(fixedCode).toBe('<template><div :class="foo"></div></template>');
	});

	test('[attr-value-quotes-009] fix: Markdown raw HTML single → double', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			"Some text\n\n<div data-attr='value'>content</div>\n",
			{ rule: { severity: 'error', value: 'double' }, parser: { '.*': '@markuplint/markdown-parser' } },
			true,
		);
		expect(fixedCode).toBe('Some text\n\n<div data-attr="value">content</div>\n');
	});
});

test('[attr-value-quotes-010] the message is in Japanese (single) with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<div class="a"></div>', { rule: 'single' }, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			message: '属性値はシングルクオートで囲むべきです',
			raw: 'class="a"',
		},
	]);
});

test('[attr-value-quotes-011] the message is in Japanese (double) with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, "<div class='a'></div>", undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			message: '属性値はダブルクオートで囲むべきです',
			raw: "class='a'",
		},
	]);
});

test('[attr-value-quotes-012] a literal in {…} is written as code and is not judged', async () => {
	const { violations } = await mlRuleTest(rule, "<div title={'x'} aria-busy={true} disabled={false}></div>", {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[attr-value-quotes-013] a single expression in quotes of Svelte is an expression', async () => {
	const { violations } = await mlRuleTest(rule, "<button disabled='{false}'></button>", {
		parser: { '.*': '@markuplint/svelte-parser' },
		specs: { '.*': '@markuplint/svelte-spec' },
	});
	expect(violations).toStrictEqual([]);
});

test('[attr-value-quotes-014] a value of Pug is code and is not judged', async () => {
	const { violations } = await mlRuleTest(rule, "a(href='x')", { parser: { '.*': '@markuplint/pug-parser' } });
	expect(violations).toStrictEqual([]);
});

test('[attr-value-quotes-015] a string of HTML is judged as before', async () => {
	const { violations } = await mlRuleTest(rule, "<div title='x'></div>");
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			message: 'Attribute value must be quoted with double quotation marks',
			raw: "title='x'",
		},
	]);
});
