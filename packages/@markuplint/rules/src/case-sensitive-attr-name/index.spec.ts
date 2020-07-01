import * as markuplint from 'markuplint';
import rule from './';

describe('verify', () => {
	test('lower case', async () => {
		const r = await markuplint.verify(
			'<div data-lowercase></div>',
			{
				rules: {
					'case-sensitive-attr-name': true,
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('upper case', async () => {
		const r = await markuplint.verify(
			'<div data-UPPERCASE="value"></div>',
			{
				rules: {
					'case-sensitive-attr-name': true,
				},
			},
			[rule],
			'en',
		);
		expect(r[0].severity).toBe('warning');
		expect(r[0].message).toBe('Attribute name of HTML elements should be lowercase');
		expect(r[0].raw).toBe('data-UPPERCASE');
	});

	test('upper case', async () => {
		const r = await markuplint.verify(
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
		expect(r[0].severity).toBe('error');
		expect(r[0].message).toBe('Attribute name of HTML elements must be uppercase');
	});

	test('upper case', async () => {
		const r = await markuplint.verify(
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
		expect(r[0].severity).toBe('error');
		expect(r[0].message).toBe('Attribute name of HTML elements must be uppercase');
	});

	test('upper case', async () => {
		const r = await markuplint.verify(
			'<div DATA-UPPERCASE="value"></div>',
			{ rules: { 'case-sensitive-attr-name': ['error', 'no-lower'] } },
			[rule],
			'en',
		);
		expect(r.length).toBe(0);
	});

	test('foreign elements', async () => {
		const r = await markuplint.verify(
			'<svg viewBox="0 0 100 100"></svg>',
			{ rules: { 'case-sensitive-attr-name': true } },
			[rule],
			'en',
		);
		expect(r.length).toBe(0);
	});
});

describe('fix', () => {
	test('upper case', async () => {
		const fixed = await markuplint.fix(
			'<DIV DATA-LOWERCASE></DIV>',
			{ rules: { 'case-sensitive-attr-name': true } },
			[rule],
			'en',
		);
		expect(fixed).toBe('<DIV data-lowercase></DIV>');
	});

	test('upper case', async () => {
		const fixed = await markuplint.fix(
			'<DIV data-lowercase></DIV>',
			{ rules: { 'case-sensitive-attr-name': 'no-lower' } },
			[rule],
			'en',
		);
		expect(fixed).toBe('<DIV DATA-LOWERCASE></DIV>');
	});
});
