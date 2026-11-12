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

	function ruleUnderTest(): string | undefined {
		const testPath = expect.getState().testPath ?? '';
		const name = path.relative(RULES_SRC, path.dirname(testPath)).split(path.sep)[0];
		return name && name in presetRules ? name : undefined;
	}

	async function mlRuleTest(...args: RuleTestArgs) {
		const name = ruleUnderTest();
		if (!name) {
			return original.mlRuleTest(...args);
		}
		const [, sourceCode, config = { rule: true }, fix = false, locale = 'en'] = args;
		const { rule, nodeRule, childNodeRule, ...rest } = config;
		const scoped = <N extends { rule?: unknown }>(entries: N[] | undefined) =>
			entries?.map(({ rule: value, ...entry }) => ({
				...entry,
				rules: value === undefined ? undefined : { [name]: value },
			}));
		const fallbacks: string[] = [];
		const write = process.stderr.write.bind(process.stderr);
		process.stderr.write = ((chunk: string | Uint8Array, ...more: unknown[]) => {
			if (String(chunk).includes('[experimental-rust-core]')) {
				fallbacks.push(String(chunk).trim());
				return true;
			}
			return (write as (...a: unknown[]) => boolean)(chunk, ...more);
		}) as typeof process.stderr.write;
		try {
			const engine = await original.MLEngine.fromCode(sourceCode, {
				config: {
					...rest,
					rules: { [name]: rule ?? true },
					nodeRules: scoped(nodeRule),
					childNodeRules: scoped(childNodeRule),
				} as never,
				locale,
				fix,
				ignoreExt: true,
				importPresetRules: true,
				experimentalRustCore: true,
			});
			const result = await engine.exec();
			if (fallbacks.length > 0) {
				throw new Error(`The Rust engine did not lint this: ${fallbacks.join(' / ')}`);
			}
			const violations = (result?.violations ?? []).map(({ ruleId: _, ...v }) => v);
			return {
				violations,
				fixedCode: result?.fixedCode ?? sourceCode,
				fixSummary: result?.fixSummary,
			};
		} finally {
			process.stderr.write = write;
		}
	}

	return { ...original, mlRuleTest };
});
