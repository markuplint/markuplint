import { mlTest } from 'markuplint';
import rule from './';

test('h1', async () => {
	const { violations } = await mlTest(
		'<html><body>text</body></html>',
		{
			rules: {
				'required-h1': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'Require the "h1" element',
			line: 1,
			col: 1,
			raw: '<',
			ruleId: 'required-h1',
		},
	]);
});

test('h1', async () => {
	const { violations } = await mlTest(
		'<html><body><h1>text</h1></body></html>',
		{
			rules: {
				'required-h1': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations.length).toBe(0);
});

test('h1', async () => {
	const { violations } = await mlTest(
		'<html><body><h1>text</h1><h1>text</h1></body></html>',
		{
			rules: {
				'required-h1': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The "h1" element is duplicated',
			line: 1,
			col: 26,
			raw: '<h1>',
			ruleId: 'required-h1',
		},
	]);
});

test('h1', async () => {
	const { violations } = await mlTest(
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
	expect(violations.length).toBe(0);
});

test('h1', async () => {
	const { violations } = await mlTest(
		'<div><h2>text</h2></div>',
		{
			rules: {
				'required-h1': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations.length).toBe(0);
});

test('enable to opetion "in-document-fragment"', async () => {
	const { violations } = await mlTest(
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
	expect(violations.length).toBe(1);
});

test('Issue #57', async () => {
	const { violations } = await mlTest(
		'',
		{
			rules: {
				'required-h1': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations.length).toBe(0);
});
