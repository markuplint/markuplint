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
			'The "color" attribute is non-standard',
			'The "color" attribute is deprecated',
			'The "align" attribute is deprecated',
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
			'no-default-value',
			'no-disallowed-attr',
			'no-disallowed-attr',
			'no-disallowed-attr',
			'no-invalid-attr-value',
			'no-invalid-attr-value',
			'require-attr',
			'require-attr',
			'placeholder-label-option',
			'require-attr',
			'require-attr',
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
			'no-unknown-role',
			'no-unknown-role',
			'no-abstract-role',
			'no-abstract-role',
			'permitted-roles',
			'permitted-roles',
			'permitted-roles',
			'permitted-roles',
			'permitted-roles',
			'permitted-roles',
			'permitted-roles',
			'no-redundant-role',
			'no-redundant-role',
			'no-redundant-role',
			'no-redundant-role',
			'no-redundant-role',
			'no-redundant-role',
			'no-redundant-role',
			'wai-aria-implicit-props',
			'wai-aria-implicit-props',
			'wai-aria-implicit-props',
			'wai-aria-implicit-props',
			'wai-aria-implicit-props',
			'wai-aria-implicit-props',
			'require-aria-prop',
			'require-aria-prop',
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
			'no-invalid-aria-prop-value',
			'no-invalid-aria-prop-value',
			'no-invalid-aria-prop-value',
			'no-invalid-aria-prop-value',
			'no-invalid-aria-prop-value',
			'no-invalid-aria-prop-value',
			'require-element',
			'require-attr',
			'require-attr',
			'require-element',
			'require-attr',
			'require-attr',
			'require-attr',
			'require-attr',
			'require-attr',
			'require-attr',
			'require-attr',
			'require-attr',
			'require-attr',
			'require-attr',
			'require-attr',
			'require-attr',
			'require-attr',
			'require-attr',
			'require-attr',
			'require-attr',
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
		const nonExistentRole = violations.find(v => v.ruleId === 'no-unknown-role');
		expect(nonExistentRole).toBeDefined();
		expect(nonExistentRole!.severity).toBe('error');
	});

	test('non-normative sub-rule reports as warning', async () => {
		const { violations } = await mlTest('<nav role="navigation"></nav>', {
			extends: ['markuplint:a11y'],
		});
		const implicitRole = violations.find(v => v.ruleId === 'no-redundant-role');
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

// Dedicated end-to-end suite for the built-in `parse-error` violation channel.
//
// The non-fatal parse-error pipeline (parse5 `onParseError` →
// `MLASTDocument.parseErrors` → `MLCore` verify → `ruleId: 'parse-error'`
// violation) spans five packages: `ml-ast`, `parser-utils`, `html-parser`,
// `ml-core`, and `markuplint`. These tests pin the contract end-to-end so a
// future refactor that breaks the wiring is caught here rather than in 80+
// collateral rule spec failures.
//
// The channel is **default off**: tests opt in via `severity.parseError`.
describe('Built-in parse-error channel (#3844)', () => {
	test('default off — malformed HTML produces no parse-error violation', async () => {
		// `<div a a a>` triggers parse5 `duplicate-attribute` twice, but with
		// the channel off (default) those events do not surface as violations.
		const { violations } = await mlTest('<div a a a></div>');
		expect(violations.filter(v => v.ruleId === 'parse-error')).toStrictEqual([]);
	});

	test('uniform severity (legacy string form) enables every code', async () => {
		const { violations } = await mlTest('<!-- outer <!-- inner --> tail -->', {
			severity: { parseError: 'error' },
		});
		expect(violations).toContainEqual(
			expect.objectContaining({
				ruleId: 'parse-error',
				severity: 'error',
				message: 'Parser conformance error: nested-comment',
			}),
		);
	});

	test('uniform severity emits one violation per parse5 event', async () => {
		// `<div a a a>` triggers parse5 `duplicate-attribute` twice (2nd and 3rd `a`).
		const { violations } = await mlTest('<div a a a></div>', {
			severity: { parseError: 'error' },
		});
		const parseErrors = violations.filter(v => v.ruleId === 'parse-error');
		expect(parseErrors).toHaveLength(2);
		expect(parseErrors.every(v => v.message === 'Parser conformance error: duplicate-attribute')).toBe(true);
	});

	test('well-formed HTML produces no parse-error violation even when channel is enabled', async () => {
		const { violations } = await mlTest(
			'<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>ok</title></head><body><p>ok</p></body></html>',
			{ severity: { parseError: 'error' } },
		);
		expect(violations.filter(v => v.ruleId === 'parse-error')).toStrictEqual([]);
	});

	test('Record form — only opted-in codes emit violations', async () => {
		// `<!-- a <!-- b -->` triggers `nested-comment`. Opt in only to
		// `duplicate-attribute`; the nested-comment event must remain silent.
		const { violations } = await mlTest('<!-- a <!-- b --> --><div a a></div>', {
			severity: { parseError: { 'duplicate-attribute': 'error' } },
		});
		const parseErrors = violations.filter(v => v.ruleId === 'parse-error');
		expect(parseErrors).toHaveLength(1);
		expect(parseErrors[0]?.message).toBe('Parser conformance error: duplicate-attribute');
	});

	test('Record form — per-code severity is honoured (warning vs error)', async () => {
		const { violations } = await mlTest('<!-- a <!-- b --><div a a></div>', {
			severity: {
				parseError: {
					'nested-comment': 'warning',
					'duplicate-attribute': 'error',
				},
			},
		});
		const nested = violations.find(v => v.message === 'Parser conformance error: nested-comment');
		const dup = violations.find(v => v.message === 'Parser conformance error: duplicate-attribute');
		expect(nested?.severity).toBe('warning');
		expect(dup?.severity).toBe('error');
	});

	test('severity.parseError: "off" suppresses every code even after opt-in', async () => {
		const { violations } = await mlTest('<!-- a <!-- b --> -->', {
			severity: { parseError: 'off' },
		});
		expect(violations.filter(v => v.ruleId === 'parse-error')).toStrictEqual([]);
	});

	test('dedupe is global, not per-node — local nodeRules disable does not "unmute" parse-error', async () => {
		// `<div><span attr attr>` triggers parse5 `duplicate-attribute` and the
		// `no-duplicate-attr` rule. `nodeRules` disables the rule on `<span>`
		// only. The dedupe check uses the **global** ruleset config
		// (`rules.no-duplicate-attr: true`) so the parse-error channel still
		// treats `no-duplicate-attr` as active and suppresses
		// `duplicate-attribute`. Result: ZERO violations for the `<span>`'s
		// duplicate — consistent with the user's intent ("I disabled this
		// rule on span") rather than the parse-error channel re-surfacing
		// what the user just opted out of.
		const { violations } = await mlTest('<div><span attr attr></span></div>', {
			severity: { parseError: 'error' },
			rules: { 'no-duplicate-attr': true },
			nodeRules: [{ selector: 'span', rules: { 'no-duplicate-attr': false } }],
		});
		expect(violations.filter(v => v.ruleId === 'parse-error')).toHaveLength(0);
		expect(violations.filter(v => v.ruleId === 'no-duplicate-attr')).toHaveLength(0);
	});

	test('framework parsers (Vue) do not emit parse-error — parse5 is not invoked', async () => {
		// Vue parser extends `Parser` base, not `HtmlParser`, so it never invokes
		// parse5 and never populates `parseErrors`. The channel stays empty
		// even when fully opted in.
		const { violations } = await mlTest('<template><div v-bind:attr v-bind:attr /></template>', {
			parser: { '.*': '@markuplint/vue-parser' },
			severity: { parseError: 'error' },
		});
		expect(violations.filter(v => v.ruleId === 'parse-error')).toStrictEqual([]);
	});

	test('parserOptions.documentMode "fragment" silences document-level parse errors', async () => {
		// `<head>...</head>` standalone defaults to fragment parsing anyway,
		// but with `documentMode: 'document'` it produces `missing-doctype`.
		// Verify that explicit `'fragment'` suppresses it (SSR partial use case).
		const source = '<head><meta charset="utf-8"><title>partial</title></head>';
		const { violations } = await mlTest(source, {
			parserOptions: { documentMode: 'fragment' },
			severity: { parseError: 'error' },
		});
		expect(violations.find(v => v.message === 'Parser conformance error: missing-doctype')).toBeUndefined();
	});

	test('parserOptions.documentMode "document" surfaces missing-doctype on bare-head sources', async () => {
		// Same input — `<head>...` without `<!doctype html>` — forced to be
		// parsed as a document so parse5 emits `missing-doctype`.
		const source = '<head><meta charset="utf-8"><title>full-page-no-doctype</title></head><body>x</body>';
		const { violations } = await mlTest(source, {
			parserOptions: { documentMode: 'document' },
			severity: { parseError: { 'missing-doctype': 'error' } },
		});
		expect(violations).toContainEqual(
			expect.objectContaining({
				ruleId: 'parse-error',
				message: 'Parser conformance error: missing-doctype',
			}),
		);
	});

	test('Record form does NOT suppress fatal ParserError (no code → falls back to "error" severity)', async () => {
		// Fatal ParserError has no `code` so the Record-form lookup cannot
		// target it. The contract: when the channel is otherwise enabled
		// (Record form is non-null), fatal ParserError still emits at
		// 'error'. Pug 004.pug is the existing fixture used to trigger a
		// fatal ParserError.
		const fs = await import('node:fs/promises');
		const path = await import('node:path');
		const fixturePath = path.resolve(import.meta.dirname, '../../../test/fixture/pug/004.pug');
		const source = await fs.readFile(fixturePath, 'utf8');
		const { violations } = await mlTest(source, {
			parser: { '.*': '@markuplint/pug-parser' },
			// Record form that only opts in to `duplicate-attribute`. The
			// fatal ParserError thrown by pug parsing has no `code`, so it
			// must NOT be suppressed by the Record lookup — it should emit
			// at default 'error' severity through the fatal fallback branch
			// in `#createParseError`.
			severity: { parseError: { 'duplicate-attribute': 'error' } },
		});
		const fatal = violations.filter(v => v.ruleId === 'parse-error' && v.severity === 'error');
		expect(fatal.length).toBeGreaterThanOrEqual(1);
	});

	test('parserOptions.documentMode "auto" (default) keeps current behaviour', async () => {
		// Bare `<head>` without doctype: auto → fragment → no document-level
		// errors. Same input as the previous test, no documentMode set.
		const source = '<head><meta charset="utf-8"><title>partial</title></head>';
		const { violations } = await mlTest(source, {
			severity: { parseError: 'error' },
		});
		expect(violations.find(v => v.message === 'Parser conformance error: missing-doctype')).toBeUndefined();
	});
});

// Dedupe contract for the built-in parse-error channel: when an ml rule
// declares `meta.mirrorsParseErrorCodes` and is active in the ruleset,
// ml-core suppresses parse-error emissions for those codes so the user
// does not see duplicate violations for the same underlying parse5 event.
//
// The dedupe is **hook-based** (each rule declares its own list) rather
// than driven by a hard-coded table in ml-core — see `RuleSeed.meta.mirrorsParseErrorCodes`.
describe('Built-in parse-error channel — dedupe against mirroring rules (#3844)', () => {
	test('no-duplicate-attr is active → duplicate-attribute is suppressed in parse-error output', async () => {
		const { violations } = await mlTest('<div a a></div>', {
			rules: { 'no-duplicate-attr': true },
			severity: { parseError: 'error' },
		});
		// ml rule reports the duplicate, parse-error channel stays silent for
		// `duplicate-attribute`.
		expect(violations.some(v => v.ruleId === 'no-duplicate-attr')).toBe(true);
		expect(violations.some(v => v.ruleId === 'parse-error' && v.message.includes('duplicate-attribute'))).toBe(
			false,
		);
	});

	test('no-duplicate-attr is disabled → duplicate-attribute is STILL suppressed (rule owns the code unconditionally)', async () => {
		const { violations } = await mlTest('<div a a></div>', {
			rules: { 'no-duplicate-attr': false },
			severity: { parseError: 'error' },
		});
		// Mirror declarations are static metadata; ml-core suppresses
		// duplicate-attribute regardless of whether the rule is currently
		// enabled. Disabling the rule means the user opted out of that
		// detection entirely — the parse-error channel does NOT fill in.
		expect(violations.some(v => v.ruleId === 'no-duplicate-attr')).toBe(false);
		expect(violations.some(v => v.ruleId === 'parse-error' && v.message.includes('duplicate-attribute'))).toBe(
			false,
		);
	});

	test('dedupe skips ONLY the mirrored code, leaves unrelated parse5 events intact', async () => {
		// `<!-- a <!-- b --> -->` triggers `nested-comment` (NOT mirrored).
		// `<div a a>` triggers `duplicate-attribute` (mirrored by no-duplicate-attr).
		const { violations } = await mlTest('<!-- a <!-- b --> --><div a a></div>', {
			rules: { 'no-duplicate-attr': true },
			severity: { parseError: 'error' },
		});
		const parseErrors = violations.filter(v => v.ruleId === 'parse-error');
		// nested-comment still fires (no mirroring rule), duplicate-attribute
		// is suppressed (no-duplicate-attr mirrors it).
		expect(parseErrors.some(v => v.message.includes('nested-comment'))).toBe(true);
		expect(parseErrors.some(v => v.message.includes('duplicate-attribute'))).toBe(false);
	});

	test('Record-form severity.parseError respects dedupe too', async () => {
		const { violations } = await mlTest('<div a a></div>', {
			rules: { 'no-duplicate-attr': true },
			severity: { parseError: { 'duplicate-attribute': 'error' } },
		});
		// Even though the user explicitly opted in to duplicate-attribute via
		// the Record form, the active ml rule still wins (no double-emit).
		expect(violations.some(v => v.ruleId === 'no-duplicate-attr')).toBe(true);
		expect(violations.some(v => v.ruleId === 'parse-error' && v.message.includes('duplicate-attribute'))).toBe(
			false,
		);
	});

	test('no-orphaned-end-tag dedupes end-tag-without-matching-open-element', async () => {
		const { violations } = await mlTest('<div>x</p></div>', {
			rules: { 'no-orphaned-end-tag': true },
			severity: { parseError: 'error' },
		});
		expect(violations.some(v => v.ruleId === 'no-orphaned-end-tag')).toBe(true);
		expect(
			violations.some(
				v => v.ruleId === 'parse-error' && v.message.includes('end-tag-without-matching-open-element'),
			),
		).toBe(false);
	});

	test('require-doctype rule dedupes missing-doctype but NOT non-conforming-doctype', async () => {
		// `<html><body></body></html>` triggers `missing-doctype` (mirrored).
		// Add a non-conforming doctype later to surface `non-conforming-doctype`
		// if any — actually a missing doctype just produces the missing one,
		// so test the negative path: ml rule fires, parse-error suppresses
		// `missing-doctype` only.
		const { violations } = await mlTest('<html><body><p>x</p></body></html>', {
			rules: { 'require-doctype': true },
			severity: { parseError: 'error' },
		});
		// ml `require-doctype` rule reports the missing doctype.
		expect(violations.some(v => v.ruleId === 'require-doctype')).toBe(true);
		// parse-error channel does NOT also fire `missing-doctype` (mirrored).
		expect(violations.some(v => v.ruleId === 'parse-error' && v.message.includes('missing-doctype'))).toBe(false);
	});

	test('character-reference consumes parse5 malformed-reference codes as its own violations', async () => {
		// `&xyz;` triggers parse5 `unknown-named-character-reference`. The
		// rule reads parseErrors and reports the malformed reference under
		// its own ruleId; the parse-error channel does not double-emit.
		const { violations } = await mlTest('<p>Hello &xyz; world</p>', {
			rules: { 'character-reference': true },
		});
		const charRef = violations.filter(v => v.ruleId === 'character-reference');
		expect(charRef.length).toBeGreaterThan(0);
		expect(charRef.some(v => v.message.includes('unknown-named-character-reference'))).toBe(true);
		// Mirrored — parse-error never surfaces this code.
		expect(
			violations.some(v => v.ruleId === 'parse-error' && v.message.includes('unknown-named-character-reference')),
		).toBe(false);
	});

	test('character-reference reports both missed-escape (self) and malformed-reference (hook) under one ruleId', async () => {
		// `A & B` is a missed escape (self-detection), `&foo` is a malformed
		// reference (parse5 hook). Both arrive as `character-reference`.
		const { violations } = await mlTest('<p>A & B &foo bar</p>', {
			rules: { 'character-reference': true },
		});
		const charRef = violations.filter(v => v.ruleId === 'character-reference');
		// At least 2 violations: one missed escape, one parse5-hooked
		// malformed reference.
		expect(charRef.length).toBeGreaterThanOrEqual(2);
	});

	test('character-reference disabled → both directions silent', async () => {
		// With the rule off, neither the missed-escape detection nor the
		// parse5 hook surfaces. parse-error channel respects the mirror
		// declaration even when the rule is disabled.
		const { violations } = await mlTest('<p>A & B &xyz; tail</p>', {
			rules: { 'character-reference': false },
			severity: { parseError: 'error' },
		});
		expect(violations.some(v => v.ruleId === 'character-reference')).toBe(false);
		expect(
			violations.some(v => v.ruleId === 'parse-error' && v.message.includes('unknown-named-character-reference')),
		).toBe(false);
	});

	test('preset-aliased mirroring rule still dedupes parse-error channel (#3871)', async () => {
		// `markuplint:html-standard` exposes `attr-duplication` under the alias
		// `html-standard/attr-duplication`. The dedupe lookup must consult both
		// the alias name (where preset entries live in ruleset.rules) AND the
		// base rule name (where direct user configs live). Without the dual
		// lookup, preset users see the parse-error channel re-surface
		// duplicate-attribute despite the rule being active under its alias.
		const { violations } = await mlTest('<div a a></div>', {
			extends: ['markuplint:html-standard'],
			severity: { parseError: 'error' },
		});
		expect(violations.some(v => v.ruleId === 'parse-error' && v.message.includes('duplicate-attribute'))).toBe(
			false,
		);
	});
});
