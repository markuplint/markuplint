import { testAsyncAndSyncFix, testAsyncAndSyncVerify } from '../test-utils';
import rule from './';

describe('verify', () => {
	test('lower case', async () => {
		await testAsyncAndSyncVerify(
			'<div data-lowercase></div>',
			{
				rules: {
					'case-sensitive-tag-name': true,
				},
			},
			[rule],
			'en',
		);
	});

	test('upper case', async () => {
		await testAsyncAndSyncVerify(
			'<DIV data-lowercase></DIV>',
			{
				rules: {
					'case-sensitive-tag-name': true,
				},
			},
			[rule],
			'en',
			[
				{
					severity: 'warning',
					message: 'Tag name of HTML elements should be lowercase',
					raw: 'DIV',
					ruleId: 'case-sensitive-tag-name',
					line: 1,
					col: 2,
				},
				{
					col: 23,
					line: 1,
					message: 'Tag name of HTML elements should be lowercase',
					raw: 'DIV',
					ruleId: 'case-sensitive-tag-name',
					severity: 'warning',
				},
			],
		);
	});

	test('upper case', async () => {
		await testAsyncAndSyncVerify(
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
			[
				{
					severity: 'error',
					message: 'Tag name of HTML elements must be uppercase',
					raw: 'div',
					ruleId: 'case-sensitive-tag-name',
					line: 1,
					col: 2,
				},
				{
					col: 31,
					line: 1,
					message: 'Tag name of HTML elements must be uppercase',
					raw: 'div',
					ruleId: 'case-sensitive-tag-name',
					severity: 'error',
				},
			],
		);
	});

	test('upper case', async () => {
		await testAsyncAndSyncVerify(
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
	});

	test('upper case', async () => {
		await testAsyncAndSyncVerify(
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
			1,
			r => r.length,
		);
	});

	test('upper case', async () => {
		await testAsyncAndSyncVerify(
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
			1,
			r => r.length,
		);
	});

	test('foreign elements', async () => {
		await testAsyncAndSyncVerify(
			'<svg viewBox="0 0 100 100"><textPath></textPath></svg>',
			{
				rules: {
					'case-sensitive-tag-name': true,
				},
			},
			[rule],
			'en',
		);
	});

	test('custom elements', async () => {
		await testAsyncAndSyncVerify(
			'<xxx-hoge>lorem</xxx-hoge>',
			{
				rules: {
					'case-sensitive-tag-name': true,
				},
			},
			[rule],
			'en',
		);
	});

	test('custom elements', async () => {
		await testAsyncAndSyncVerify(
			'<XXX-hoge>lorem</XXX-hoge>',
			{
				rules: {
					'case-sensitive-tag-name': true,
				},
			},
			[rule],
			'en',
			'Tag name of HTML elements should be lowercase',
			r => r[0].message,
		);
	});
});

describe('fix', () => {
	test('upper case', async () => {
		await testAsyncAndSyncFix(
			'<DIV data-lowercase></DIV>',
			{ rules: { 'case-sensitive-tag-name': true } },
			[rule],
			'en',
			'<div data-lowercase></div>',
		);
	});
});
