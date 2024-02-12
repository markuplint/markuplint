import { MLRule } from '@markuplint/ml-core';
import { describe, it, test, expect } from 'vitest';

import { setGlobal } from './global-settings.js';
import { mlTest, mlTestFile } from './testing-tool/index.js';

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
		]);
	});

	it('is reported from 003.html', async () => {
		const { violations } = await mlTestFile('test/fixture/003.html');

		const errors = violations.filter(v => v.severity === 'error');
		const warns = violations.filter(v => v.severity === 'warning');

		expect(errors.map(_ => _.message)).toStrictEqual([
			'The "color" attribute is deprecated',
			'The "align" attribute is deprecated',
			'The "font" element is obsolete',
			'Never declare obsolete doctype',
			'The value of the "id" attribute is duplicated',
			'The "font" element is not allowed in the "body" element in this context',
			'Require accessible name',
			'Require accessible name',
			'Require accessible name',
			'The "script" element expects the "defer" attribute',
			'The "script" element expects the "defer" attribute',
			'The "img" element expects the "width" attribute',
			'The "img" element expects the "height" attribute',
			'The "img" element expects the "width" attribute',
			'The "img" element expects the "height" attribute',
			'The "img" element expects the "width" attribute',
			'The "img" element expects the "height" attribute',
			'Cannot overwrite the "document" role to the "a" element according to ARIA in HTML specification',
			'Cannot overwrite the role of the "label" element according to ARIA in HTML specification',
		]);
		expect(warns.map(_ => _.message)).toStrictEqual([
			'Attribute value is must quote on double quotation mark',
			'Attribute value is must quote on double quotation mark',
			'Attribute value is must quote on double quotation mark',
			'Attribute value is must quote on double quotation mark',
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
		expect(violations.length).toEqual(76);
	});

	it('is ignoring 008.html', async () => {
		const { violations } = await mlTestFile('test/fixture/008.html');
		expect(violations.length).toEqual(0);
	});
});

describe('excludeFiles', () => {
	test('excludeFiles', async () => {
		expect((await mlTestFile('test/fixture/_excludeFiles/001.html')).violations.length).toBe(0);
		expect((await mlTestFile('test/fixture/_excludeFiles/002.html')).violations.length).toBe(1);
		expect((await mlTestFile('test/fixture/_excludeFiles/sub/003.html')).violations.length).toBe(1);
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
			void context.document.walkOn('Element', el => {});
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
