import rule from './';
import { testAsyncAndSyncVerify } from '../test-utils';

test('h1', async () => {
	await testAsyncAndSyncVerify(
		'<html><body>text</body></html>',
		{
			rules: {
				'required-h1': true,
			},
		},
		[rule],
		'en',
		[
			{
				severity: 'error',
				message: 'Missing the h1 element',
				line: 1,
				col: 1,
				raw: '<',
				ruleId: 'required-h1',
			},
		],
	);
});

test('h1', async () => {
	await testAsyncAndSyncVerify(
		'<html><body><h1>text</h1></body></html>',
		{
			rules: {
				'required-h1': true,
			},
		},
		[rule],
		'en',
	);
});

test('h1', async () => {
	await testAsyncAndSyncVerify(
		'<html><body><h1>text</h1><h1>text</h1></body></html>',
		{
			rules: {
				'required-h1': true,
			},
		},
		[rule],
		'en',
		[
			{
				severity: 'error',
				message: 'Duplicate the h1 element',
				line: 1,
				col: 26,
				raw: '<h1>',
				ruleId: 'required-h1',
			},
		],
	);
});

test('h1', async () => {
	await testAsyncAndSyncVerify(
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
});

test('h1', async () => {
	await testAsyncAndSyncVerify(
		'<div><h2>text</h2></div>',
		{
			rules: {
				'required-h1': true,
			},
		},
		[rule],
		'en',
	);
});

test('enable to opetion "in-document-fragment"', async () => {
	await testAsyncAndSyncVerify(
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
		1,
		r => r.length,
	);
});

test('Issue #57', async () => {
	await testAsyncAndSyncVerify(
		'',
		{
			rules: {
				'required-h1': true,
			},
		},
		[rule],
		'en',
	);
});
