import { testAsyncAndSyncFix, testAsyncAndSyncVerify } from '../test-utils';
import rule from './';

describe('verify', () => {
	test('lower case', async () => {
		await testAsyncAndSyncVerify(
			'<div data-lowercase></div>',
			{
				rules: {
					'case-sensitive-attr-name': true,
				},
			},
			[rule],
			'en',
		);
	});

	test('upper case', async () => {
		await testAsyncAndSyncVerify(
			'<div data-UPPERCASE="value"></div>',
			{
				rules: {
					'case-sensitive-attr-name': true,
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Attribute name of HTML elements should be lowercase',
					raw: 'data-UPPERCASE',
					ruleId: 'case-sensitive-attr-name',
					line: 1,
					col: 6,
				},
			],
		);
	});

	test('upper case', async () => {
		await testAsyncAndSyncVerify(
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
			[
				{
					severity: 'error',
					message: 'Attribute name of HTML elements must be uppercase',
					raw: 'data-UPPERCASE',
					ruleId: 'case-sensitive-attr-name',
					line: 1,
					col: 6,
				},
			],
		);
	});

	test('upper case', async () => {
		await testAsyncAndSyncVerify(
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
			[
				{
					severity: 'error',
					message: 'Attribute name of HTML elements must be uppercase',
					raw: 'data-uppercase',
					ruleId: 'case-sensitive-attr-name',
					line: 1,
					col: 6,
				},
			],
		);
	});

	test('upper case', async () => {
		await testAsyncAndSyncVerify(
			'<div DATA-UPPERCASE="value"></div>',
			{ rules: { 'case-sensitive-attr-name': ['error', 'no-lower'] } },
			[rule],
			'en',
		);
	});

	test('foreign elements', async () => {
		await testAsyncAndSyncVerify(
			'<svg viewBox="0 0 100 100"></svg>',
			{ rules: { 'case-sensitive-attr-name': true } },
			[rule],
			'en',
		);
	});
});

describe('fix', () => {
	test('upper case', async () => {
		await testAsyncAndSyncFix(
			'<DIV DATA-LOWERCASE></DIV>',
			{ rules: { 'case-sensitive-attr-name': true } },
			[rule],
			'en',
			'<DIV data-lowercase></DIV>',
		);
	});

	test('upper case', async () => {
		await testAsyncAndSyncFix(
			'<DIV data-lowercase></DIV>',
			{ rules: { 'case-sensitive-attr-name': 'no-lower' } },
			[rule],
			'en',
			'<DIV DATA-LOWERCASE></DIV>',
		);
	});
});
