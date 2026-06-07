import { MLRule } from '@markuplint/ml-core';
import { mlTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

/**
 * Creates a rule that cyclically rewrites the value of `data-x` according to
 * the given map (e.g., `{ a: 'b', b: 'a' }`), producing oscillating fixes.
 */
function createFlipRule(cycleMap: Readonly<Record<string, string>>) {
	return new MLRule({
		name: 'test-flip',
		defaultValue: null,
		defaultOptions: null,
		verify(context) {
			const raw = context.document.raw;
			const matched = /data-x="([a-z])"/.exec(raw);
			const current = matched?.[1];
			const next = current == null ? undefined : cycleMap[current];
			if (matched == null || next == null) {
				return;
			}
			const valueStart = matched.index + 'data-x="'.length;
			context.report({
				message: `flip to ${next}`,
				line: 1,
				col: 1,
				raw: matched[0],
				fix: fixer => fixer.replaceRange([valueStart, valueStart + 1], next),
			});
		},
	});
}

/**
 * A rule whose fix always overlaps the flip/break rule's fix (zero-width edit
 * inside the value), so one fix is skipped every pass and the multi-pass loop
 * keeps running.
 */
const overlapRule = new MLRule({
	name: 'test-overlap',
	defaultValue: null,
	defaultOptions: null,
	verify(context) {
		const raw = context.document.raw;
		const matched = /data-x="([a-z])"/.exec(raw);
		if (matched == null) {
			return;
		}
		const valueStart = matched.index + 'data-x="'.length;
		context.report({
			message: 'overlap',
			line: 1,
			col: 1,
			raw: matched[0],
			fix: fixer => fixer.replaceRange([valueStart, valueStart], 'x'),
		});
	},
});

/**
 * A rule whose fix removes the closing quote of `data-x="a"`, producing
 * code that no longer parses (used with the JSX parser, which raises a
 * fatal parse error on an unterminated string).
 */
const breakRule = new MLRule({
	name: 'test-break',
	defaultValue: null,
	defaultOptions: null,
	verify(context) {
		const raw = context.document.raw;
		const matched = /data-x="a"/.exec(raw);
		if (matched == null) {
			return;
		}
		const attrStart = matched.index;
		context.report({
			message: 'break',
			line: 1,
			col: 1,
			raw: matched[0],
			fix: fixer => fixer.replaceRange([attrStart, attrStart + matched[0].length], 'data-x="a'),
		});
	},
});

describe('multi-pass fix', () => {
	test('[multi-pass-fix-fix-001] no overlap (single pass resolves all)', async () => {
		const { fixedCode } = await mlTest(
			"<DIV CLASS='a'></DIV>",
			{
				rules: {
					'case-sensitive-tag-name': true,
					'attr-value-quotes': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<div CLASS="a"></div>');
	});

	test('[multi-pass-fix-fix-002] overlap resolved in multi-pass', async () => {
		const { fixedCode } = await mlTest(
			"<DIV DATA-FOO='val'></DIV>",
			{
				rules: {
					'case-sensitive-tag-name': true,
					'case-sensitive-attr-name': true,
					'attr-value-quotes': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<div data-foo="val"></div>');
	});

	test('[multi-pass-fix-fix-003] fix produces no changes on valid code', async () => {
		const { fixedCode } = await mlTest(
			'<div></div>',
			{
				rules: {
					'case-sensitive-tag-name': true,
					'case-sensitive-attr-name': true,
					'attr-value-quotes': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<div></div>');
	});

	test('[multi-pass-fix-fix-004] 5+ rules applied together (overlap only, no cascading)', async () => {
		const { fixedCode } = await mlTest(
			"<DIV CLASS='a' CLASS='b' DATA-FOO='val'></DIV>",
			{
				rules: {
					'case-sensitive-tag-name': true,
					'case-sensitive-attr-name': true,
					'attr-value-quotes': true,
					'attr-duplication': true,
				},
			},
			undefined,
			'en',
			true,
		);
		// Tag name lowered, attr names lowered, quotes normalized, duplicate removed
		expect(fixedCode).toBe('<div class="a" data-foo="val"></div>');
	});
});

describe('multi-pass fix with parsers', () => {
	test('[multi-pass-fix-fix-005] Pug: attr-value-quotes + no-boolean-attr-value', async () => {
		const { fixedCode } = await mlTest(
			"input(disabled='disabled' type='text')",
			{
				parser: { '.*': '@markuplint/pug-parser' },
				rules: {
					'attr-value-quotes': { severity: 'error', value: 'double' },
					'no-boolean-attr-value': true,
				},
			},
			undefined,
			'en',
			true,
		);
		// disabled='disabled' → disabled (boolean fix), type='text' → type="text" (quote fix)
		expect(fixedCode).toBe('input(disabled type="text")');
	});

	test('[multi-pass-fix-fix-006] Pug: attr-value-quotes + no-default-value', async () => {
		const { fixedCode } = await mlTest(
			"input(type='text' placeholder='enter')",
			{
				parser: { '.*': '@markuplint/pug-parser' },
				rules: {
					'attr-value-quotes': { severity: 'error', value: 'double' },
					'no-default-value': true,
				},
			},
			undefined,
			'en',
			true,
		);
		// type='text' → removed (default value), placeholder='enter' → placeholder="enter" (quote fix)
		// Leading space remains after attribute removal in Pug bracket syntax
		expect(fixedCode).toBe('input( placeholder="enter")');
	});

	test('[multi-pass-fix-fix-007] Vue: attr-value-quotes + no-boolean-attr-value', async () => {
		const { fixedCode } = await mlTest(
			"<template><input disabled='disabled' data-foo='bar' /></template>",
			{
				parser: { '.*': '@markuplint/vue-parser' },
				rules: {
					'attr-value-quotes': { severity: 'error', value: 'double' },
					'no-boolean-attr-value': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<template><input disabled data-foo="bar" /></template>');
	});

	test('[multi-pass-fix-fix-008] Vue: attr-value-quotes + attr-duplication', async () => {
		const { fixedCode } = await mlTest(
			"<template><div class='a' class='b'></div></template>",
			{
				parser: { '.*': '@markuplint/vue-parser' },
				rules: {
					'attr-value-quotes': { severity: 'error', value: 'double' },
					'attr-duplication': true,
				},
			},
			undefined,
			'en',
			true,
		);
		// Duplicate removed + quotes normalized
		expect(fixedCode).toBe('<template><div class="a"></div></template>');
	});

	test('[multi-pass-fix-fix-009] JSX: no-boolean-attr-value on element with multiple attrs', async () => {
		const { fixedCode } = await mlTest(
			'<><input disabled="disabled" required="required" /></>',
			{
				parser: { '.*': '@markuplint/jsx-parser' },
				rules: {
					'no-boolean-attr-value': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<><input disabled required /></>');
	});

	test('[multi-pass-fix-fix-010] Markdown: attr-value-quotes + no-boolean-attr-value on raw HTML', async () => {
		const { fixedCode } = await mlTest(
			"Some text\n\n<input disabled='disabled' data-foo='bar' />\n",
			{
				parser: { '.*': '@markuplint/markdown-parser' },
				rules: {
					'attr-value-quotes': { severity: 'error', value: 'double' },
					'no-boolean-attr-value': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('Some text\n\n<input disabled data-foo="bar" />\n');
	});
});

describe('finalPassViolations', () => {
	test('[multi-pass-fix-issue-3890-001] non-fixable violations remain after re-verification of the fixed code', async () => {
		const { violations, fixedCode, fixSummary } = await mlTest(
			"<img src='x' foo='bar'>",
			{
				rules: {
					'attr-value-quotes': true,
					'invalid-attr': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<img src="x" foo="bar">');
		// First-pass violations contain both the fixed and the unfixable ones
		expect(violations.filter(v => v.ruleId === 'attr-value-quotes')).toHaveLength(2);
		expect(violations.filter(v => v.ruleId === 'invalid-attr')).toHaveLength(1);
		// finalPassViolations reflect the FIXED code: quotes are resolved,
		// the invalid attribute remains
		expect(fixSummary?.finalPassViolations?.map(v => v.ruleId)).toStrictEqual(['invalid-attr']);
	});

	test('[multi-pass-fix-issue-3890-002] empty when every violation is fixed', async () => {
		const { violations, fixedCode, fixSummary } = await mlTest(
			"<DIV DATA-FOO='val'></DIV>",
			{
				rules: {
					'case-sensitive-tag-name': true,
					'case-sensitive-attr-name': true,
					'attr-value-quotes': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<div data-foo="val"></div>');
		// tag-name case (start and end tags) + attr-name case + quote style
		expect(violations).toHaveLength(4);
		// The fixed code has no remaining violations — the accurate signal
		// for CI pipelines checking post-fix results (issue #3890)
		expect(fixSummary?.finalPassViolations).toStrictEqual([]);
	});

	test('[multi-pass-fix-issue-3890-003] undefined when no fixes are applied', async () => {
		const { fixSummary } = await mlTest(
			'<div></div>',
			{
				rules: {
					'attr-value-quotes': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixSummary?.passCount).toBe(0);
		// No fixes applied: the first-pass violations are accurate as-is
		expect(fixSummary?.finalPassViolations).toBeUndefined();
	});

	test('[multi-pass-fix-issue-3890-004] config-error violations are kept in finalPassViolations', async () => {
		const { fixedCode, fixSummary } = await mlTest(
			"<img src='x'>",
			{
				rules: {
					'attr-value-quotes': true,
					'this-rule-does-not-exist': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<img src="x">');
		// The quote violation is fixed; the config-level violation persists
		expect(fixSummary?.finalPassViolations?.map(v => v.ruleId)).toStrictEqual(['config-error']);
	});

	test('[multi-pass-fix-issue-3890-005] reflects the final code when the pass limit is reached', async () => {
		// Non-converging, non-cycling fixes: a → b → … → k (10 passes, no repeat)
		const { fixedCode, fixSummary } = await mlTest(
			'<div data-x="a"></div>',
			{
				rules: {
					'test-flip': true,
					'test-overlap': true,
				},
			},
			[
				createFlipRule({
					a: 'b',
					b: 'c',
					c: 'd',
					d: 'e',
					e: 'f',
					f: 'g',
					g: 'h',
					h: 'i',
					i: 'j',
					j: 'k',
					k: 'l',
				}),
				overlapRule,
			],
			'en',
			true,
		);
		expect(fixSummary?.reachedMaxPasses).toBe(true);
		expect(fixSummary?.passCount).toBe(10);
		expect(fixedCode).toBe('<div data-x="k"></div>');
		// Reuse path: the last pass's rule run already verified the final code
		expect(fixSummary?.finalPassViolations).toHaveLength(2);
		expect(fixSummary?.finalPassViolations?.every(v => v.fix != null)).toBe(true);
	});
});

describe('cycle detection', () => {
	test('[multi-pass-fix-issue-3891-001] 2-pass oscillation (A → B → A) stops early', async () => {
		const sourceCode = '<div data-x="a"></div>';
		const { fixedCode, fixSummary } = await mlTest(
			sourceCode,
			{
				rules: {
					'test-flip': true,
					'test-overlap': true,
				},
			},
			[createFlipRule({ a: 'b', b: 'a' }), overlapRule],
			'en',
			true,
		);
		expect(fixedCode).toBe(sourceCode);
		expect(fixSummary?.passCount).toBe(2);
		expect(fixSummary?.reachedMaxPasses).toBe(false);
		// The oscillating violations are still present in the final code
		expect(fixSummary?.finalPassViolations).toHaveLength(2);
	});

	test('[multi-pass-fix-issue-3891-002] 3-pass oscillation (A → B → C → A) is detected', async () => {
		const sourceCode = '<div data-x="a"></div>';
		const { fixedCode, fixSummary } = await mlTest(
			sourceCode,
			{
				rules: {
					'test-flip': true,
					'test-overlap': true,
				},
			},
			[createFlipRule({ a: 'b', b: 'c', c: 'a' }), overlapRule],
			'en',
			true,
		);
		expect(fixedCode).toBe(sourceCode);
		// Detected at the pass that reproduces the original code,
		// NOT by exhausting MAX_FIX_PASSES (issue #3891)
		expect(fixSummary?.passCount).toBe(3);
		expect(fixSummary?.reachedMaxPasses).toBe(false);
		// The oscillating violations are still present in the final code,
		// carrying fix data computed against the final code
		expect(fixSummary?.finalPassViolations).toHaveLength(2);
		expect(fixSummary?.finalPassViolations?.every(v => v.fix != null)).toBe(true);
	});
});

describe('unparsable fix output', () => {
	test('[multi-pass-fix-fix-011] multi-pass: pass producing unparsable code is rolled back', async () => {
		const sourceCode = '<><div data-x="a"></div></>';
		const { fixedCode, fixSummary } = await mlTest(
			sourceCode,
			{
				parser: { '.*': '@markuplint/jsx-parser' },
				rules: {
					'test-break': true,
					'test-overlap': true,
				},
			},
			[breakRule, overlapRule],
			'en',
			true,
		);
		// The fix output (unterminated string) fails to parse as JSX,
		// so the pass is rolled back instead of writing broken code
		expect(fixedCode).toBe(sourceCode);
		expect(fixSummary?.totalApplied).toBe(0);
		expect(fixSummary?.firstPassEdits).toStrictEqual([]);
		expect(fixSummary?.finalPassViolations).toBeUndefined();
	});

	test('[multi-pass-fix-fix-012] single pass: unparsable output is rolled back, not written', async () => {
		const sourceCode = '<><div data-x="a"></div></>';
		const { fixedCode, fixSummary } = await mlTest(
			sourceCode,
			{
				parser: { '.*': '@markuplint/jsx-parser' },
				rules: {
					'test-break': true,
				},
			},
			[breakRule],
			'en',
			true,
		);
		// All fixes apply in a single pass (no overlap), but the output
		// fails to parse — it must be rolled back the same way
		expect(fixedCode).toBe(sourceCode);
		expect(fixSummary?.passCount).toBe(1);
		expect(fixSummary?.totalApplied).toBe(0);
		expect(fixSummary?.firstPassEdits).toStrictEqual([]);
		expect(fixSummary?.finalPassViolations).toBeUndefined();
	});
});
