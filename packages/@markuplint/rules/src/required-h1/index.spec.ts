import * as markuplint from 'markuplint';
import rule from './';

test('h1', async () => {
	const r = await markuplint.verify(
		'<html><body>text</body></html>',
		{
			rules: {
				'required-h1': true,
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: 'Missing the h1 element',
			line: 1,
			col: 1,
			raw: '<',
			ruleId: 'required-h1',
		},
	]);
});

test('h1', async () => {
	const r = await markuplint.verify(
		'<html><body><h1>text</h1></body></html>',
		{
			rules: {
				'required-h1': true,
			},
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(0);
});

test('h1', async () => {
	const r = await markuplint.verify(
		'<html><body><h1>text</h1><h1>text</h1></body></html>',
		{
			rules: {
				'required-h1': true,
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: 'Duplicate the h1 element',
			line: 1,
			col: 26,
			raw: '<h1>',
			ruleId: 'required-h1',
		},
	]);
});

test('h1', async () => {
	const r = await markuplint.verify(
		'<html><body><h1>text</h1><h1>text</h1></body></html>',
		{
			rules: {
				'required-h1': {
					severity: 'error',
					value: true,
					option: {
						'expected-once': false,
					},
				},
			},
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(0);
});

test('h1', async () => {
	const r = await markuplint.verify(
		'<div><h2>text</h2></div>',
		{
			rules: {
				'required-h1': true,
			},
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(0);
});

test('enable to opetion "in-document-fragment"', async () => {
	const r = await markuplint.verify(
		'<div><h2>text</h2></div>',
		{
			rules: {
				'required-h1': {
					severity: 'error',
					option: {
						'in-document-fragment': true,
					},
				},
			},
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(1);
});
