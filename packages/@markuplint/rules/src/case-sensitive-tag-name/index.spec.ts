import * as markuplint from 'markuplint';
import rule from './';

describe('verify', () => {
	test('lower case', async () => {
		const r = await markuplint.verify(
			'<div data-lowercase></div>',
			{
				rules: {
					'case-sensitive-tag-name': true,
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('upper case', async () => {
		const r = await markuplint.verify(
			'<DIV data-lowercase></DIV>',
			{
				rules: {
					'case-sensitive-tag-name': true,
				},
			},
			[rule],
			'en',
		);
		expect(r[0].severity).toBe('warning');
		expect(r[0].message).toBe('Tag name of HTML element should be lowercase');
		expect(r[0].raw).toBe('DIV');
	});

	test('upper case', async () => {
		const r = await markuplint.verify(
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
		expect(r[0].severity).toBe('error');
		expect(r[0].message).toBe('Tag name of HTML element must be uppercase');
	});

	test('upper case', async () => {
		const r = await markuplint.verify(
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
		expect(r.length).toBe(0);
	});

	test('upper case', async () => {
		const r = await markuplint.verify(
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
		expect(r.length).toBe(1);
	});

	test('upper case', async () => {
		const r = await markuplint.verify(
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
		expect(r.length).toBe(1);
	});

	test('foreign elements', async () => {
		const r = await markuplint.verify(
			'<svg viewBox="0 0 100 100"><textPath></textPath></svg>',
			{
				rules: {
					'case-sensitive-tag-name': true,
				},
			},
			[rule],
			'en',
		);
		expect(r.length).toBe(0);
	});

	test('custom elements', async () => {
		const r = await markuplint.verify(
			'<xxx-hoge>lorem</xxx-hoge>',
			{
				rules: {
					'case-sensitive-tag-name': true,
				},
			},
			[rule],
			'en',
		);
		expect(r.length).toBe(0);
	});

	test('custom elements', async () => {
		const r = await markuplint.verify(
			'<XXX-hoge>lorem</XXX-hoge>',
			{
				rules: {
					'case-sensitive-tag-name': true,
				},
			},
			[rule],
			'en',
		);
		expect(r[0].message).toBe('Tag name of HTML element should be lowercase');
	});
});

describe('fix', () => {
	test('upper case', async () => {
		const fixed = await markuplint.fix(
			'<DIV data-lowercase></DIV>',
			{ rules: { 'case-sensitive-tag-name': true } },
			[rule],
			'en',
		);
		expect(fixed).toBe('<div data-lowercase></div>');
	});
});
