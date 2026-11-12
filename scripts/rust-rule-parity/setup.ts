/**
 * Runs the rule specs of `@markuplint/rules` against the Rust engine.
 *
 * `mlRuleTest` hands the rule under test to the TypeScript engine as a custom rule, which the
 * Rust engine never evaluates (a custom rule makes it fall back). Here it is replaced: the rule
 * is enabled by its registered name, the one the spec file's directory carries, and the file is
 * linted with `experimentalRustCore`. A fallback to the TypeScript engine fails the test, so a
 * pass is the Rust engine's own result.
 */

import type * as Markuplint from 'markuplint';

import path from 'node:path';

import { expect, vi } from 'vitest';

type MarkuplintModule = typeof Markuplint;
type RuleTestArgs = Parameters<MarkuplintModule['mlRuleTest']>;

const RULES_SRC = path.resolve('packages', '@markuplint', 'rules', 'src');

vi.mock('markuplint', async importOriginal => {
	const original = await importOriginal<MarkuplintModule>();
	const { default: presetRules } = await import('@markuplint/rules');
	const { lintWithRust } = await import('./rust-engine.ts');

	function ruleUnderTest(): string | undefined {
		const testPath = expect.getState().testPath ?? '';
		const name = path.relative(RULES_SRC, path.dirname(testPath)).split(path.sep)[0];
		return name && name in presetRules ? name : undefined;
	}

	function mlRuleTest(...args: RuleTestArgs) {
		const name = ruleUnderTest();
		if (!name) {
			return original.mlRuleTest(...args);
		}
		return lintWithRust(original, name, args);
	}

	return { ...original, mlRuleTest };
});
