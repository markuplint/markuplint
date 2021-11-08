import { mlTest } from 'markuplint';
import rule from './';

describe('verify', () => {
	test('lower case', async () => {
		const { violations } = await mlTest(
			'<div data-lowercase></div>',
			{
				rules: {
					'case-sensitive-attr-name': true,
				},
			},
			[rule],
			'en',
		);
		expect(violations).toStrictEqual([]);
	});

	test('upper case', async () => {
		const { violations } = await mlTest(
			'<div data-UPPERCASE="value"></div>',
			{
				rules: {
					'case-sensitive-attr-name': true,
				},
			},
			[rule],
			'en',
		);
		expect(violations[0].severity).toBe('warning');
		expect(violations[0].message).toBe('Attribute names of HTML elements should be lowercase');
		expect(violations[0].raw).toBe('data-UPPERCASE');
	});

	test('upper case', async () => {
		const { violations } = await mlTest(
			'<div data-UPPERCASE="value"></div>',
			{
				rules: {
					'case-sensitive-attr-name': {
						severity: 'error',
						value: 'no-lower',
						option: null,
					},
				},
			},
			[rule],
			'en',
		);
		expect(violations[0].severity).toBe('error');
		expect(violations[0].message).toBe('Attribute names of HTML elements must be uppercase');
	});

	test('upper case', async () => {
		const { violations } = await mlTest(
			'<div data-uppercase="value"></div>',
			{
				rules: {
					'case-sensitive-attr-name': {
						severity: 'error',
						value: 'no-lower',
						option: null,
					},
				},
			},
			[rule],
			'en',
		);
		expect(violations[0].severity).toBe('error');
		expect(violations[0].message).toBe('Attribute names of HTML elements must be uppercase');
	});

	test('upper case', async () => {
		const { violations } = await mlTest(
			'<div DATA-UPPERCASE="value"></div>',
			{ rules: { 'case-sensitive-attr-name': ['error', 'no-lower'] } },
			[rule],
			'en',
		);
		expect(violations.length).toBe(0);
	});

	test('svg', async () => {
		const { violations } = await mlTest(
			'<svg viewBox="0 0 100 100"></svg>',
			{ rules: { 'case-sensitive-attr-name': true } },
			[rule],
			'en',
		);
		expect(violations.length).toBe(0);
	});
});

describe('fix', () => {
	test('upper case', async () => {
		const { fixedCode } = await mlTest(
			'<DIV DATA-LOWERCASE></DIV>',
			{ rules: { 'case-sensitive-attr-name': true } },
			[rule],
			'en',
			true,
		);
		expect(fixedCode).toBe('<DIV data-lowercase></DIV>');
	});

	test('upper case', async () => {
		const { fixedCode } = await mlTest(
			'<DIV data-lowercase></DIV>',
			{ rules: { 'case-sensitive-attr-name': 'no-lower' } },
			[rule],
			'en',
			true,
		);
		expect(fixedCode).toBe('<DIV DATA-LOWERCASE></DIV>');
	});
});
