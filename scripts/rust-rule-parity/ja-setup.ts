/**
 * Setup file of `vitest.rust-rule-ja-parity.config.ts`; see `ja-messages.ts` for the purpose and how to run it.
 *
 * `mlRuleTest` is replaced by a function that returns the TypeScript engine's result (the testing
 * API with `MARKUPLINT_EXPERIMENTAL_RUST_CORE` off) for the spec's own arguments, so every spec runs
 * its own expectations to the end and reaches all of its inputs.
 * Beside that, for each call, it lints the same input and config in Japanese with both engines and
 * appends a line to the file `ML_JA_PARITY_OUT` names when the messages differ.
 */

import type * as Markuplint from 'markuplint';

import { appendFileSync } from 'node:fs';
import path from 'node:path';

import { expect, vi } from 'vitest';

type MarkuplintModule = typeof Markuplint;
type RuleTestArgs = Parameters<MarkuplintModule['mlRuleTest']>;

const RULES_SRC = path.resolve('packages', '@markuplint', 'rules', 'src');

/** One line of the output file. */
export type JaParityRecord =
	| {
			readonly kind: 'diff';
			readonly rule: string;
			readonly test: string;
			readonly ts: string;
			readonly rust: string;
			readonly source: string;
	  }
	| {
			readonly kind: 'count';
			readonly rule: string;
			readonly test: string;
			readonly ts: number;
			readonly rust: number;
			readonly source: string;
	  }
	| {
			readonly kind: 'rust-error';
			readonly rule: string;
			readonly test: string;
			readonly error: string;
			readonly source: string;
	  };

vi.mock('markuplint', async importOriginal => {
	const original = await importOriginal<MarkuplintModule>();
	const { default: presetRules } = await import('@markuplint/rules');
	const { assertRustCoreSwitch, lintWithRust, withRustCore } = await import('./rust-engine.ts');
	await assertRustCoreSwitch(original);
	const out = process.env.ML_JA_PARITY_OUT;

	function ruleUnderTest(): string | undefined {
		const testPath = expect.getState().testPath ?? '';
		const name = path.relative(RULES_SRC, path.dirname(testPath)).split(path.sep)[0];
		return name && name in presetRules ? name : undefined;
	}

	function record(line: JaParityRecord) {
		if (out) {
			appendFileSync(out, JSON.stringify(line) + '\n');
		}
	}

	async function compare(name: string, args: RuleTestArgs) {
		const test = expect.getState().currentTestName ?? '';
		const source = args[1];
		// A config object is read by both engines; `mlRuleTest` fills `rule` into it, so each gets a copy
		const copy = (): RuleTestArgs => [args[0], args[1], args[2] && { ...args[2] }, false, 'ja'];
		try {
			// Off explicitly: a variable that the developer's shell has exported must not move the TypeScript side.
			const ts = await withRustCore(false, () => original.mlRuleTest(...copy()));
			const rust = await lintWithRust(original, copy());
			if (ts.violations.length !== rust.violations.length) {
				record({
					kind: 'count',
					rule: name,
					test,
					ts: ts.violations.length,
					rust: rust.violations.length,
					source,
				});
				return;
			}
			for (const [i, violation] of ts.violations.entries()) {
				const other = rust.violations[i]!;
				if (violation.message !== other.message) {
					record({ kind: 'diff', rule: name, test, ts: violation.message, rust: other.message, source });
					return;
				}
			}
		} catch (error) {
			record({
				kind: 'rust-error',
				rule: name,
				test,
				error: String(error instanceof Error ? error.message : error),
				source,
			});
		}
	}

	async function mlRuleTest(...args: RuleTestArgs) {
		const name = ruleUnderTest();
		if (name) {
			await compare(name, args);
		}
		return withRustCore(false, () => original.mlRuleTest(...args));
	}

	return { ...original, mlRuleTest };
});
