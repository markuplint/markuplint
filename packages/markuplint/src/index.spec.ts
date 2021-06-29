import * as markuplint from './';
import { Result, createRule } from '@markuplint/ml-core';

describe('basic test', () => {
	it('is empty result of 001.html', async () => {
		const r = await markuplint.exec({
			files: 'test/fixture/001.html',
		});
		expect(r[0].results.length).toBe(0);
	});

	it('is reported from 002.html', async () => {
		const r = await markuplint.exec({
			files: 'test/fixture/002.html',
			locale: 'en',
		});
		expect(r[0].results).toEqual([
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
		]);
	});

	it('is reported from 006.html', async () => {
		const r = await markuplint.exec({
			files: 'test/fixture/006.html',
			locale: 'en',
		});
		expect(r[0].results).toEqual([
			{
				severity: 'error',
				message: 'The a is invalid element (7:6)',
				line: 7,
				col: 6,
				raw: '<a>',
				ruleId: 'parse-error',
			},
		]);
	});

	it('is reported from 007.html', async () => {
		const r = await markuplint.exec({
			files: 'test/fixture/007.html',
			locale: 'en',
		});
		expect(r[0].results.length).toEqual(17);
	});

	it('is ignoring 008.html', async () => {
		const r = await markuplint.exec({
			files: 'test/fixture/008.html',
			locale: 'en',
		});
		expect(r.length).toEqual(0);
	});
});

describe('async and sync rules', () => {
	const asyncReports: Result[] = [
		{
			severity: 'error',
			message: 'async error test',
			line: 1,
			col: 1,
			raw: 'content',
		},
	];

	const syncReports: Result[] = [
		{
			severity: 'error',
			message: 'sync error test',
			line: 1,
			col: 1,
			raw: 'content',
		},
	];

	const asyncRule = createRule({
		name: 'test-async-rule',
		defaultValue: null,
		defaultOptions: null,
		async verify(document, translate, rule) {
			await document.walk(async node => {});
			return asyncReports;
		},
	});

	const syncRule = createRule({
		name: 'test-sync-rule',
		defaultValue: null,
		defaultOptions: null,
		verify(document, translate, rule) {
			document.walk(node => {});
			return syncReports;
		},
	});

	it('works correctly with async rule', async () => {
		const r = await markuplint.exec({
			sourceCodes: /*HTML*/ 'content',
			locale: 'en',
			rules: [asyncRule],
			config: {
				rules: {
					'test-async-rule': true,
				},
			},
		});
		expect(r[0].results).toMatchObject(asyncReports);
	});

	it('works correctly with sync rule', async () => {
		const r = await markuplint.exec({
			sourceCodes: /*HTML*/ 'content',
			locale: 'en',
			rules: [syncRule],
			config: {
				rules: {
					'test-sync-rule': true,
				},
			},
		});
		expect(r[0].results).toMatchObject(syncReports);
	});

	it('works correctly with async and sync mixed rules', async () => {
		const r = await markuplint.exec({
			sourceCodes: /*HTML*/ 'content',
			locale: 'en',
			rules: [asyncRule, syncRule],
			config: {
				rules: {
					'test-async-rule': true,
					'test-sync-rule': true,
				},
			},
		});
		// This test also ensures that rules are executed sequentially
		expect(r[0].results).toMatchObject([...asyncReports, ...syncReports]);
	});
});
