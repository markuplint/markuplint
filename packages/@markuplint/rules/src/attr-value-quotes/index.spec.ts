import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('verify', () => {
	test('default', async () => {
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
				message: 'Attribute value is must quote on double quotation mark',
				line: 2,
				col: 26,
				raw: "data-Attr='db'",
			},
			{
				severity: 'warning',
				message: 'Attribute value is must quote on double quotation mark',
				line: 2,
				col: 41,
				raw: 'data-attR=tr',
			},
		]);
	});

	test('double', async () => {
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
				message: 'Attribute value is must quote on double quotation mark',
				line: 2,
				col: 26,
				raw: "data-Attr='db'",
			},
			{
				severity: 'error',
				message: 'Attribute value is must quote on double quotation mark',
				line: 2,
				col: 41,
				raw: 'data-attR=tr',
			},
		]);
	});

	test('single', async () => {
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
				message: 'Attribute value is must quote on single quotation mark',
				line: 2,
				col: 8,
				raw: 'data-attr="value"',
			},
			{
				severity: 'error',
				message: 'Attribute value is must quote on single quotation mark',
				line: 2,
				col: 41,
				raw: 'data-attR=tr',
			},
		]);
	});

	test('empty', async () => {
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
	test('empty', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<div attr noop=noop foo="bar" hoge=\'fuga\'>', undefined, true);
		expect(fixedCode).toEqual('<div attr noop="noop" foo="bar" hoge="fuga">');
	});

	test('empty', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<div attr noop=noop foo="bar" hoge=\'fuga\'>',
			{ rule: 'single' },
			true,
		);
		expect(fixedCode).toEqual("<div attr noop='noop' foo='bar' hoge='fuga'>");
	});
});
