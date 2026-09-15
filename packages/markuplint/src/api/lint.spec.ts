import { describe, test, expect } from 'vitest';

import { lint } from './lint.js';

describe('lint() (#3997)', () => {
	test('lints multiple files sharing one config independently', async () => {
		const results = await lint(
			[
				{ sourceCode: '<div id="a"></div><div id="a"></div>', name: 'a.html' },
				{ sourceCode: '<p>ok</p>', name: 'b.html' },
			],
			{ config: { rules: { 'no-duplicate-id': true } } },
		);

		expect(results).toHaveLength(2);
		const [a, b] = results;
		expect(a?.violations.some(v => v.ruleId === 'no-duplicate-id')).toBe(true);
		expect(b?.violations.some(v => v.ruleId === 'no-duplicate-id')).toBe(false);
	});

	test('deduplicates a repeated rule-deprecation notice across files sharing one config', async () => {
		const results = await lint(
			[
				{ sourceCode: '<div id="a"></div><div id="a"></div>', name: 'a.html' },
				{ sourceCode: '<div id="b"></div><div id="b"></div>', name: 'b.html' },
			],
			{ config: { rules: { 'id-duplication': true } } },
		);

		expect(results).toHaveLength(2);
		const [a, b] = results;
		// The deprecation notice is kept only in the first file's result...
		expect(a?.violations.some(v => v.ruleId === 'rule-deprecation')).toBe(true);
		expect(b?.violations.some(v => v.ruleId === 'rule-deprecation')).toBe(false);
		// ...but the check itself still ran independently for both files.
		expect(a?.violations.some(v => v.ruleId === 'no-duplicate-id')).toBe(true);
		expect(b?.violations.some(v => v.ruleId === 'no-duplicate-id')).toBe(true);
	});

	test('a genuine config-error is also deduplicated across files, independent of rule-deprecation', async () => {
		const results = await lint(
			[
				{ sourceCode: '<p>ok</p>', name: 'a.html' },
				{ sourceCode: '<p>ok</p>', name: 'b.html' },
			],
			{ config: { rules: { 'nonexistent-rule': true } } },
		);

		expect(results).toHaveLength(2);
		const [a, b] = results;
		expect(a?.violations.filter(v => v.ruleId === 'config-error')).toHaveLength(1);
		expect(b?.violations.filter(v => v.ruleId === 'config-error')).toHaveLength(0);
	});

	test('dedupes config-level violations in fixSummary.finalPassViolations too, when fix mode applies fixes', async () => {
		// `attr-value-quotes` has an auto-fixer, so fix mode produces a
		// `fixSummary` for both files; `id-duplication` (deprecated) has none,
		// so its notice only ever appears via the config-level channel, never
		// as something fixed. `finalPassViolations` must be deduped the same
		// way `violations` is — not just the first-pass array.
		const results = await lint(
			[
				{ sourceCode: '<html lang=en></html>', name: 'a.html' },
				{ sourceCode: '<html lang=en></html>', name: 'b.html' },
			],
			{ config: { rules: { 'id-duplication': true, 'attr-value-quotes': true } }, fix: true },
		);

		expect(results).toHaveLength(2);
		const [a, b] = results;
		// File a's OWN `violations` (first pass) and `fixSummary.finalPassViolations`
		// (post-fix) both keep the notice — they describe the same file, so
		// this isn't a cross-file repeat worth suppressing.
		expect(a?.violations.some(v => v.ruleId === 'rule-deprecation')).toBe(true);
		expect(a?.fixSummary?.finalPassViolations?.some(v => v.ruleId === 'rule-deprecation')).toBe(true);
		// File b is the actual repeat: suppressed in both of its arrays.
		expect(b?.violations.some(v => v.ruleId === 'rule-deprecation')).toBe(false);
		expect(b?.fixSummary?.finalPassViolations?.some(v => v.ruleId === 'rule-deprecation')).toBe(false);
	});
});
