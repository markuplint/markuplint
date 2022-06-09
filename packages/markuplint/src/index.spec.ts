import { MLRule } from '@markuplint/ml-core';

import { setGlobal } from './global-settings';
import { mlTest, mlTestFile } from './testing-tool';

setGlobal({
	locale: 'en',
});

describe('basic test', () => {
	it('is empty result of 001.html', async () => {
		const { violations } = await mlTestFile('test/fixture/001.html');
		expect(violations.length).toBe(0);
	});

	it('is reported from 002.html', async () => {
		const { violations } = await mlTestFile('test/fixture/002.html');
		expect(violations).toEqual([
			{
				severity: 'warning',
				message: 'Attribute value is must quote on double quotation mark',
				reason: 'For consistency',
				line: 2,
				col: 7,
				raw: 'lang=en',
				ruleId: 'attr-value-quotes',
			},
			{
				severity: 'warning',
				message: 'Attribute value is must quote on double quotation mark',
				reason: 'Another reason',
				line: 4,
				col: 8,
				raw: 'charset=UTF-8',
				ruleId: 'attr-value-quotes',
			},
			{
				severity: 'warning',
				message: 'Attribute value is must quote on double quotation mark',
				reason: 'Another reason',
				line: 5,
				col: 8,
				raw: 'name=viewport',
				ruleId: 'attr-value-quotes',
			},
			{
				severity: 'warning',
				message: 'Attribute value is must quote on double quotation mark',
				reason: 'Another reason',
				line: 5,
				col: 22,
				raw: "content='width=device-width, initial-scale=1.0'",
				ruleId: 'attr-value-quotes',
			},
			{
				severity: 'warning',
				message: 'Attribute value is must quote on double quotation mark',
				reason: 'Another reason',
				line: 6,
				col: 8,
				raw: 'http-equiv=X-UA-Compatible',
				ruleId: 'attr-value-quotes',
			},
			{
				severity: 'warning',
				message: 'Attribute value is must quote on double quotation mark',
				reason: 'Another reason',
				line: 6,
				col: 35,
				raw: 'content=ie=edge',
				ruleId: 'attr-value-quotes',
			},
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

	it('is reported from 006.html', async () => {
		const { violations } = await mlTestFile('test/fixture/006.html');
		expect(violations).toEqual([
			{
				severity: 'error',
				message: 'The a is invalid element (7:6): Broke mapping nodes.',
				line: 7,
				col: 6,
				raw: '<a>',
				ruleId: 'parse-error',
			},
		]);
	});

	it('is reported from 007.html', async () => {
		const { violations } = await mlTestFile('test/fixture/007.html');
		expect(violations.length).toEqual(51);
	});

	it('is ignoring 008.html', async () => {
		const { violations } = await mlTestFile('test/fixture/008.html');
		expect(violations.length).toEqual(0);
	});
});

describe('async and sync rules', () => {
	const asyncReport = {
		message: 'Async error test',
		line: 1,
		col: 1,
		raw: 'content',
	};

	const syncReport = {
		message: 'Sync error test',
		line: 1,
		col: 1,
		raw: 'content',
	};

	const asyncRule = new MLRule({
		name: 'test-async-rule',
		defaultValue: null,
		defaultOptions: null,
		async verify(context) {
			await context.document.walkOn('Element', el => {});
			context.report(asyncReport);
		},
	});

	const syncRule = new MLRule({
		name: 'test-sync-rule',
		defaultValue: null,
		defaultOptions: null,
		verify(context) {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			context.document.walkOn('Element', el => {});
			context.report(syncReport);
		},
	});

	it('works correctly with async rule', async () => {
		const { violations } = await mlTest(
			'content',
			{
				rules: {
					'test-async-rule': true,
				},
			},
			[asyncRule],
		);
		expect(violations).toMatchObject([asyncReport]);
	});

	it('works correctly with sync rule', async () => {
		const { violations } = await mlTest(
			'content',
			{
				rules: {
					'test-sync-rule': true,
				},
			},
			[syncRule],
		);
		expect(violations).toMatchObject([syncReport]);
	});

	it('works correctly with async and sync mixed rules', async () => {
		const { violations } = await mlTest(
			'content',
			{
				rules: {
					'test-async-rule': true,
					'test-sync-rule': true,
				},
			},
			[asyncRule, syncRule],
		);
		// This test also ensures that rules are executed sequentially
		expect(violations).toMatchObject([asyncReport, syncReport]);
	});
});
