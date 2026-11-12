import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('verify', () => {
	test('[attr-value-quotes-invalid-001] default', async () => {
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

	test('[attr-value-quotes-invalid-002] double', async () => {
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

	test('[attr-value-quotes-invalid-003] single', async () => {
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

	test('[attr-value-quotes-valid-001] empty', async () => {
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
	test('[attr-value-quotes-fix-001] empty', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<div attr noop=noop foo="bar" hoge=\'fuga\'>', undefined, true);
		expect(fixedCode).toEqual('<div attr noop="noop" foo="bar" hoge="fuga">');
	});

	test('[attr-value-quotes-fix-002] empty', async () => {
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
	test('[attr-value-quotes-fix-003] fix: Pug is not fixed, its value is code', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			"div(class='foo')",
			{ rule: { severity: 'error', value: 'double' }, parser: { '.*': '@markuplint/pug-parser' } },
			true,
		);
		expect(fixedCode).toBe("div(class='foo')");
	});

	test('[attr-value-quotes-fix-004] fix: Vue single → double', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			"<template><div :class='foo'></div></template>",
			{ rule: { severity: 'error', value: 'double' }, parser: { '.*': '@markuplint/vue-parser' } },
			true,
		);
		expect(fixedCode).toBe('<template><div :class="foo"></div></template>');
	});

	test('[attr-value-quotes-fix-005] fix: Markdown raw HTML single → double', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			"Some text\n\n<div data-attr='value'>content</div>\n",
			{ rule: { severity: 'error', value: 'double' }, parser: { '.*': '@markuplint/markdown-parser' } },
			true,
		);
		expect(fixedCode).toBe('Some text\n\n<div data-attr="value">content</div>\n');
	});
});

test('[attr-value-quotes-issue-4584-001] the message is in Japanese (single) with locale ja', async () => {
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

test('[attr-value-quotes-issue-4584-002] the message is in Japanese (double) with locale ja', async () => {
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
