import { describe, expect, test } from 'vitest';

import rules from './index.js';

/**
 * Meta-test for the parse-error dedupe contract (#3844 follow-up).
 *
 * Each rule may declare `meta.mirrorsParseErrorCodes` to opt into ml-core's
 * automatic suppression of overlapping parse5 events. Two failure modes
 * we want to catch at PR-review time:
 *
 * - **Duplicate declarations**: two rules claiming the same parse5 code
 *   would make the dedupe ambiguous. The first registration wins, but the
 *   second is dead intent that quietly diverges from documentation.
 * - **Typos / stale codes**: parse5 retires a code or someone misspells
 *   it. The runtime `Set.has()` would silently skip nothing, so the
 *   tokenizer-level event still surfaces alongside the rule violation.
 *   (Stricter static check belongs in `@markuplint/html-parser`'s
 *   `parse-error-code-sync.spec.ts`, which already pins parse5's ERR
 *   enum against `MLASTParseErrorCode`.)
 */
describe('mirrorsParseErrorCodes registry contract', () => {
	test('no two rules declare the same parse5 code', () => {
		const owner = new Map<string, string[]>();
		for (const [ruleName, rule] of Object.entries(rules)) {
			const codes = rule.meta?.mirrorsParseErrorCodes ?? [];
			for (const code of codes) {
				const owners = owner.get(code) ?? [];
				owners.push(ruleName);
				owner.set(code, owners);
			}
		}

		const duplicates = [...owner.entries()].filter(([, owners]) => owners.length > 1);
		expect(duplicates, `duplicated mirror declarations: ${JSON.stringify(duplicates)}`).toEqual([]);
	});

	test('each rule declaring mirrors uses a non-empty array', () => {
		// Catches a regression where someone adds `mirrorsParseErrorCodes: []`
		// as a placeholder — meaningless and confusing.
		const empty: string[] = [];
		for (const [ruleName, rule] of Object.entries(rules)) {
			const codes = rule.meta?.mirrorsParseErrorCodes;
			if (codes !== undefined && codes.length === 0) {
				empty.push(ruleName);
			}
		}
		expect(empty, `rules with empty mirrorsParseErrorCodes (use undefined instead): ${empty.join(', ')}`).toEqual(
			[],
		);
	});
});
