import { mlTest } from 'markuplint';
import rule from './';

describe('verify', () => {
	test('default', async () => {
		const { violations } = await mlTest(
			`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
			{
				rules: {
					'attr-value-quotes': true,
				},
			},
			[rule],
			'en',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Attribute value is must quote on double quotation mark',
				line: 2,
				col: 26,
				raw: "data-Attr='db'",
				ruleId: 'attr-value-quotes',
			},
			{
				severity: 'warning',
				message: 'Attribute value is must quote on double quotation mark',
				line: 2,
				col: 41,
				raw: 'data-attR=tr',
				ruleId: 'attr-value-quotes',
			},
		]);
	});

	test('double', async () => {
		const { violations } = await mlTest(
			`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
			{
				rules: {
					'attr-value-quotes': {
						severity: 'error',
						value: 'double',
						option: null,
					},
				},
			},
			[rule],
			'en',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Attribute value is must quote on double quotation mark',
				line: 2,
				col: 26,
				raw: "data-Attr='db'",
				ruleId: 'attr-value-quotes',
			},
			{
				severity: 'error',
				message: 'Attribute value is must quote on double quotation mark',
				line: 2,
				col: 41,
				raw: 'data-attR=tr',
				ruleId: 'attr-value-quotes',
			},
		]);
	});

	test('single', async () => {
		const { violations } = await mlTest(
			`
		<div data-attr="value" data-Attr='db' data-attR=tr>
			lorem
			<p>ipsam</p>
		</div>
		`,
			{
				rules: {
					'attr-value-quotes': {
						severity: 'error',
						value: 'single',
						option: null,
					},
				},
			},
			[rule],
			'en',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Attribute value is must quote on single quotation mark',
				line: 2,
				col: 8,
				raw: 'data-attr="value"',
				ruleId: 'attr-value-quotes',
			},
			{
				severity: 'error',
				message: 'Attribute value is must quote on single quotation mark',
				line: 2,
				col: 41,
				raw: 'data-attR=tr',
				ruleId: 'attr-value-quotes',
			},
		]);
	});

	test('empty', async () => {
		const { violations } = await mlTest(
			`
		<div data-attr>
			lorem
			<p>ipsam</p>
		</div>
		`,
			{
				rules: {
					'attr-value-quotes': true,
				},
			},
			[rule],
			'en',
		);
		expect(violations.length).toBe(0);
	});
});

describe('fix', () => {
	test('empty', async () => {
		const { fixedCode } = await mlTest(
			'<div attr noop=noop foo="bar" hoge=\'fuga\'>',
			{
				rules: {
					'attr-value-quotes': true,
				},
			},
			[rule],
			'en',
			true,
		);
		expect(fixedCode).toEqual('<div attr noop="noop" foo="bar" hoge="fuga">');
	});

	test('empty', async () => {
		const { fixedCode } = await mlTest(
			'<div attr noop=noop foo="bar" hoge=\'fuga\'>',
			{
				rules: {
					'attr-value-quotes': 'single',
				},
			},
			[rule],
			'en',
			true,
		);
		expect(fixedCode).toEqual("<div attr noop='noop' foo='bar' hoge='fuga'>");
	});
});
