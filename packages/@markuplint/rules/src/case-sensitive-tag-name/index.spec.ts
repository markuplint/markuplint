import { mlTest } from 'markuplint';

import rule from './';

describe('verify', () => {
	test('lower case', async () => {
		const { violations } = await mlTest(
			'<div data-lowercase></div>',
			{
				rules: {
					'case-sensitive-tag-name': true,
				},
			},
			[rule],
			'en',
		);
		expect(violations).toStrictEqual([]);
	});

	test('upper case', async () => {
		const { violations } = await mlTest(
			'<DIV data-lowercase></DIV>',
			{
				rules: {
					'case-sensitive-tag-name': true,
				},
			},
			[rule],
			'en',
		);
		expect(violations[0].severity).toBe('warning');
		expect(violations[0].message).toBe('Tag names of HTML elements should be lowercase');
		expect(violations[0].raw).toBe('DIV');
	});

	test('upper case', async () => {
		const { violations } = await mlTest(
			'<div data-UPPERCASE="value"></div>',
			{
				rules: {
					'case-sensitive-tag-name': {
						severity: 'error',
						value: 'upper',
					},
				},
			},
			[rule],
			'en',
		);
		expect(violations[0].severity).toBe('error');
		expect(violations[0].message).toBe('Tag names of HTML elements must be uppercase');
	});

	test('upper case', async () => {
		const { violations } = await mlTest(
			'<DIV data-uppercase="value"></DIV>',
			{
				rules: {
					'case-sensitive-tag-name': {
						severity: 'error',
						value: 'upper',
					},
				},
			},
			[rule],
			'en',
		);
		expect(violations.length).toBe(0);
	});

	test('upper case', async () => {
		const { violations } = await mlTest(
			'<DIV DATA-UPPERCASE="value"></div>',
			{
				rules: {
					'case-sensitive-tag-name': {
						severity: 'error',
						value: 'upper',
					},
				},
			},
			[rule],
			'en',
		);
		expect(violations.length).toBe(1);
	});

	test('upper case', async () => {
		const { violations } = await mlTest(
			'<div DATA-UPPERCASE="value"></DIV>',
			{
				rules: {
					'case-sensitive-tag-name': {
						severity: 'error',
						value: 'upper',
					},
				},
			},
			[rule],
			'en',
		);
		expect(violations.length).toBe(1);
	});

	test('svg', async () => {
		const { violations } = await mlTest(
			'<svg viewBox="0 0 100 100"><textPath></textPath></svg>',
			{
				rules: {
					'case-sensitive-tag-name': true,
				},
			},
			[rule],
			'en',
		);
		expect(violations.length).toBe(0);
	});

	test('custom elements', async () => {
		const { violations } = await mlTest(
			'<xxx-hoge>lorem</xxx-hoge>',
			{
				rules: {
					'case-sensitive-tag-name': true,
				},
			},
			[rule],
			'en',
		);
		expect(violations.length).toBe(0);
	});

	test('custom elements', async () => {
		const { violations } = await mlTest(
			'<XXX-hoge>lorem</XXX-hoge>',
			{
				rules: {
					'case-sensitive-tag-name': true,
				},
			},
			[rule],
			'en',
		);
		expect(violations.length).toBe(0);
	});
});

describe('fix', () => {
	test('upper case', async () => {
		const { fixedCode } = await mlTest(
			'<DIV data-lowercase></DIV>',
			{ rules: { 'case-sensitive-tag-name': true } },
			[rule],
			'en',
			true,
		);
		expect(fixedCode).toBe('<div data-lowercase></div>');
	});
});
