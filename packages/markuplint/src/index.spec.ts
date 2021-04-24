import { testAsyncAndSyncExec } from './test-utils';

describe('basic test', () => {
	it('is empty result of 001.html', async () => {
		await testAsyncAndSyncExec({
			files: 'test/fixture/001.html',
		});
	});

	it('is reported from 002.html', async () => {
		await testAsyncAndSyncExec(
			{
				files: 'test/fixture/002.html',
				locale: 'en',
			},
			[
				{
					severity: 'warning',
					message: 'Attribute value is must quote on double quotation mark',
					line: 2,
					col: 7,
					raw: 'lang=en',
					ruleId: 'attr-value-quotes',
				},
				{
					severity: 'warning',
					message: 'Attribute value is must quote on double quotation mark',
					line: 4,
					col: 8,
					raw: 'charset=UTF-8',
					ruleId: 'attr-value-quotes',
				},
				{
					severity: 'warning',
					message: 'Attribute value is must quote on double quotation mark',
					line: 5,
					col: 8,
					raw: 'name=viewport',
					ruleId: 'attr-value-quotes',
				},
				{
					severity: 'warning',
					message: 'Attribute value is must quote on double quotation mark',
					line: 5,
					col: 22,
					raw: "content='width=device-width, initial-scale=1.0'",
					ruleId: 'attr-value-quotes',
				},
				{
					severity: 'warning',
					message: 'Attribute value is must quote on double quotation mark',
					line: 6,
					col: 8,
					raw: 'http-equiv=X-UA-Compatible',
					ruleId: 'attr-value-quotes',
				},
				{
					severity: 'warning',
					message: 'Attribute value is must quote on double quotation mark',
					line: 6,
					col: 35,
					raw: 'content=ie=edge',
					ruleId: 'attr-value-quotes',
				},
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

	it('is reported from 006.html', async () => {
		await testAsyncAndSyncExec(
			{
				files: 'test/fixture/006.html',
				locale: 'en',
			},
			[
				{
					severity: 'error',
					message: 'The a is invalid element (7:6)',
					line: 7,
					col: 6,
					raw: '<a>',
					ruleId: 'parse-error',
				},
			],
		);
	});

	it('is reported from 007.html', async () => {
		await testAsyncAndSyncExec(
			{
				files: 'test/fixture/007.html',
				locale: 'en',
			},
			16,
			r => r.length,
		);
	});
});
