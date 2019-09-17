import * as markuplint from 'markuplint';
import rule from '.';

describe('verify', () => {
	test('void element', async () => {
		const r = await markuplint.verify(
			'<img>',
			{
				rules: {
					'self-closing-tag': { value: 'always' },
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				raw: '<img>',
				line: 1,
				col: 1,
				message: 'Self closing solidus is needed for void element',
				ruleId: 'self-closing-tag',
				severity: 'warning',
			},
		]);
	});

	test('void element with closing solidus', async () => {
		const r = await markuplint.verify(
			'<img/>',
			{
				rules: {
					'self-closing-tag': { value: 'always' },
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('normal element', async () => {
		const r = await markuplint.verify(
			'<div></div>',
			{
				rules: {
					'self-closing-tag': { value: 'always' },
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('start tag only', async () => {
		const r = await markuplint.verify(
			'<div>',
			{
				rules: {
					'self-closing-tag': { value: 'always' },
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				raw: '<div>',
				line: 1,
				col: 1,
				message: 'Self closing solidus is needed for void element',
				ruleId: 'self-closing-tag',
				severity: 'warning',
			},
		]);
	});
});

describe('fix', () => {
	test('add self closing solidus', async () => {
		const r = await markuplint.fix(
			'<img>',
			{
				rules: {
					'self-closing-tag': { value: 'always' },
				},
			},
			[rule],
			'en',
		);
		expect(r).toEqual('<img/>');
	});
});
