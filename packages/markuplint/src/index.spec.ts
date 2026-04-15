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
		expect(violations).toStrictEqual([]);
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
			'Orphaned end tag detected',
			'Orphaned end tag detected',
			'The "font" element is not allowed in the "body" element in this context',
			'The value of the "id" attribute is duplicated',
			'Require accessible name',
			'Require accessible name',
			'Require accessible name',
			'Cannot overwrite the "document" role to the "a" element according to ARIA in HTML specification',
			'Cannot overwrite the "button" role to the "label" element according to ARIA in HTML specification',
			'The "script" element expects the "defer" attribute',
			'The "script" element expects the "defer" attribute',
			'The "img" element expects the "width" attribute',
			'The "img" element expects the "height" attribute',
			'The "img" element expects the "width" attribute',
			'The "img" element expects the "height" attribute',
			'The "img" element expects the "width" attribute',
			'The "img" element expects the "height" attribute',
		]);
		expect(warns.map(_ => _.message)).toStrictEqual([
			'Attribute value is must quote on double quotation mark',
			'Attribute value is must quote on double quotation mark',
			'Attribute value is must quote on double quotation mark',
			'Attribute value is must quote on double quotation mark',
			'Attribute names of HTML elements should be lowercase',
			'Tag names of HTML elements should be lowercase',
			'Tag names of HTML elements should be lowercase',
			'It is the default value',
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
		expect(violations.map(v => v.ruleId)).toStrictEqual([
			'invalid-attr',
			'invalid-attr',
			'no-default-value',
			'required-attr',
			'required-attr',
			'placeholder-label-option',
			'required-attr',
			'required-attr',
			'invalid-attr',
			'invalid-attr',
			'invalid-attr',
			'invalid-attr',
			'invalid-attr',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'require-accessible-name',
			'wai-aria-non-existent-role',
			'wai-aria-non-existent-role',
			'wai-aria-abstract-role',
			'wai-aria-abstract-role',
			'wai-aria-permitted-roles',
			'wai-aria-permitted-roles',
			'wai-aria-permitted-roles',
			'wai-aria-permitted-roles',
			'wai-aria-permitted-roles',
			'wai-aria-permitted-roles',
			'wai-aria-permitted-roles',
			'wai-aria-implicit-role',
			'wai-aria-implicit-role',
			'wai-aria-implicit-role',
			'wai-aria-implicit-role',
			'wai-aria-implicit-role',
			'wai-aria-implicit-role',
			'wai-aria-implicit-role',
			'wai-aria-implicit-props',
			'wai-aria-implicit-props',
			'wai-aria-implicit-props',
			'wai-aria-implicit-props',
			'wai-aria-implicit-props',
			'wai-aria-implicit-props',
			'wai-aria-required-props',
			'wai-aria-required-props',
			'wai-aria-disallowed-props',
			'wai-aria-disallowed-props',
			'wai-aria-disallowed-props',
			'wai-aria-disallowed-props',
			'wai-aria-disallowed-props',
			'wai-aria-disallowed-props',
			'wai-aria-disallowed-props',
			'wai-aria-disallowed-props',
			'wai-aria-disallowed-props',
			'wai-aria-disallowed-props',
			'wai-aria-disallowed-props',
			'wai-aria-disallowed-props',
			'wai-aria-disallowed-props',
			'wai-aria-value',
			'wai-aria-value',
			'wai-aria-value',
			'wai-aria-value',
			'wai-aria-value',
			'wai-aria-value',
			'required-element',
			'required-attr',
			'required-attr',
			'invalid-attr',
			'invalid-attr',
			'invalid-attr',
			'invalid-attr',
			'invalid-attr',
			'invalid-attr',
			'required-element',
			'required-attr',
			'required-attr',
			'required-attr',
			'required-attr',
			'required-attr',
			'required-attr',
			'required-attr',
			'required-attr',
			'required-attr',
			'required-attr',
			'required-attr',
			'required-attr',
			'required-attr',
			'required-attr',
			'required-attr',
			'required-attr',
		]);
	});

	it('is ignoring 008.html', async () => {
		const { violations } = await mlTestFile('test/fixture/008.html');
		expect(violations).toStrictEqual([]);
	});
});

describe('wai-aria sub-rule severity via preset', () => {
	test('normative sub-rule reports as error', async () => {
		const { violations } = await mlTest('<div role="hoge"></div>', {
			extends: ['markuplint:a11y'],
		});
		const nonExistentRole = violations.find(v => v.ruleId === 'wai-aria-non-existent-role');
		expect(nonExistentRole).toBeDefined();
		expect(nonExistentRole!.severity).toBe('error');
	});

	test('non-normative sub-rule reports as warning', async () => {
		const { violations } = await mlTest('<nav role="navigation"></nav>', {
			extends: ['markuplint:a11y'],
		});
		const implicitRole = violations.find(v => v.ruleId === 'wai-aria-implicit-role');
		expect(implicitRole).toBeDefined();
		expect(implicitRole!.severity).toBe('warning');
	});
});

describe('excludeFiles', () => {
	test('excludeFiles', async () => {
		expect((await mlTestFile('test/fixture/_excludeFiles/001.html')).violations).toStrictEqual([]);
		expect((await mlTestFile('test/fixture/_excludeFiles/002.html')).violations.map(v => v.ruleId)).toStrictEqual([
			'permitted-contents',
		]);
		expect(
			(await mlTestFile('test/fixture/_excludeFiles/sub/003.html')).violations.map(v => v.ruleId),
		).toStrictEqual(['permitted-contents']);
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

describe('fixSummary pipeline', () => {
	it('fixSummary is present when fix=true and fixes exist', async () => {
		const { fixSummary, fixedCode } = await mlTest(
			'<input required="required" />',
			{ rules: { 'no-boolean-attr-value': true } },
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<input required />');
		expect(fixSummary).toBeDefined();
		expect(fixSummary!.passCount).toBeGreaterThanOrEqual(1);
		expect(fixSummary!.totalApplied).toBeGreaterThanOrEqual(1);
		expect(fixSummary!.totalSkipped).toBeGreaterThanOrEqual(0);
		expect(fixSummary!.reachedMaxPasses).toBe(false);
		expect(fixSummary!.firstPassEdits.length).toBeGreaterThanOrEqual(1);
	});

	it('fixSummary is present with zero counts when fix=true but no fixes', async () => {
		const { fixSummary } = await mlTest(
			'<input required />',
			{ rules: { 'no-boolean-attr-value': true } },
			undefined,
			'en',
			true,
		);
		expect(fixSummary).toBeDefined();
		expect(fixSummary!.passCount).toBe(0);
		expect(fixSummary!.totalApplied).toBe(0);
		expect(fixSummary!.totalSkipped).toBe(0);
		expect(fixSummary!.reachedMaxPasses).toBe(false);
		expect(fixSummary!.firstPassEdits).toStrictEqual([]);
	});

	it('fixSummary is undefined when fix=false', async () => {
		const { fixSummary } = await mlTest(
			'<input required="required" />',
			{ rules: { 'no-boolean-attr-value': true } },
			undefined,
			'en',
			false,
		);
		expect(fixSummary).toBeUndefined();
	});
});

// Regression guard for Issue #3594.
//
// Primary impact: markuplint's attr tokenizer used to reject `<source type=image/gif>`
// as "Invalid tag syntax". That false-positive `ParserError` replaced the whole
// document with a single `parse-error` violation, silencing every other rule.
//
// This test pins the END-TO-END contract: valid HTML (per the WHATWG spec's
// "attribute value (unquoted) state") must NOT emit `parse-error`, and unrelated
// rules must still run. A unit test on attr-tokenizer alone cannot catch this
// because the collateral silencing happens in MLCore, not in the tokenizer.
describe('Issue #3594 — unquoted "/" does not block the lint pipeline', () => {
	const cases = [
		{
			label: '<source srcset=x type=image/gif>',
			html: '<!doctype html>\n<html lang=en><head><meta charset=utf-8><title>t</title></head><body><picture><source srcset=x type=image/gif><img src=x alt=x></picture></body></html>',
		},
		{
			label: '<script src=/foo.js>',
			html: '<!doctype html>\n<html lang=en><head><meta charset=utf-8><title>t</title></head><body><script src=/foo.js></script></body></html>',
		},
		{
			label: '<img src=/a/b alt=x>',
			html: '<!doctype html>\n<html lang=en><head><meta charset=utf-8><title>t</title></head><body><img src=/a/b alt=x></body></html>',
		},
	];

	for (const { label, html } of cases) {
		it(`does not emit parse-error for ${label}`, async () => {
			const { violations } = await mlTest(html, { extends: ['markuplint:recommended'] });
			const parseErrors = violations.filter(v => v.ruleId === 'parse-error');
			expect(parseErrors).toStrictEqual([]);
		});
	}

	// Before the fix, the `parse-error` violation short-circuited the pipeline
	// by replacing MLCore's #document with the ParserError, so no other rule
	// ever ran. This case deliberately includes an `attr-value-quotes` target
	// (`src=x` is unquoted) to prove the rest of the pipeline keeps executing.
	it('other rules keep running on documents that previously threw', async () => {
		const { violations } = await mlTest(
			'<!doctype html>\n<html lang=en><head><meta charset=utf-8><title>t</title></head><body><picture><source srcset=x type=image/gif><img src=x alt=x></picture></body></html>',
			{ rules: { 'attr-value-quotes': true } },
		);
		const unrelated = violations.filter(v => v.ruleId !== 'parse-error');
		expect(unrelated.length).toBeGreaterThan(0);
		expect(unrelated.some(v => v.ruleId === 'attr-value-quotes')).toBe(true);
	});
});
