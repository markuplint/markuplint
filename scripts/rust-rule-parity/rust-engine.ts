/**
 * Lints the input of a rule spec with the Rust engine through the testing API, shared by `setup.ts`
 * (which asserts the spec's expectations on the result) and `ja-setup.ts` (which compares the
 * messages with the TypeScript engine's).
 *
 * The testing API lints with the Rust engine while `MARKUPLINT_EXPERIMENTAL_RUST_CORE` is on, and
 * falls back to the TypeScript engine, with a warning on stderr, when the native addon is missing. A
 * pass of the parity run must be the Rust engine's own result, so a fallback is watched for here.
 */

import type * as Markuplint from 'markuplint';

type MarkuplintModule = typeof Markuplint;
export type RuleTestArgs = Parameters<MarkuplintModule['mlRuleTest']>;

/** The environment variable that makes the testing API lint with the Rust engine. */
export const RUST_CORE_ENV = 'MARKUPLINT_EXPERIMENTAL_RUST_CORE';

/**
 * Collects what the Rust engine tells on stderr about a fallback to the TypeScript engine until
 * `stop()`; everything else passes through. It patches the global `process.stderr.write`, and the
 * testing API reads the environment variable the same way: specs of a file run one after another.
 * A collected line is not written, and its write callback, if any, is called.
 */
export function watchFallbacks() {
	const fallbacks: string[] = [];
	const write = process.stderr.write.bind(process.stderr);
	process.stderr.write = ((chunk: string | Uint8Array, ...more: unknown[]) => {
		if (String(chunk).includes('[experimental-rust-core]')) {
			fallbacks.push(String(chunk).trim());
			for (const callback of more) {
				if (typeof callback === 'function') {
					callback();
				}
			}
			return true;
		}
		return (write as (...a: unknown[]) => boolean)(chunk, ...more);
	}) as typeof process.stderr.write;
	return {
		fallbacks,
		stop() {
			process.stderr.write = write;
		},
	};
}

/**
 * Runs `fn` with the testing API on the Rust engine (`on`) or on the TypeScript engine, and puts the
 * variable back. It changes the environment of the process, so two calls must not overlap: the specs
 * of a file, and the calls of `ja-setup.ts`, run one after another.
 */
export async function withRustCore<T>(on: boolean, fn: () => Promise<T>): Promise<T> {
	const before = process.env[RUST_CORE_ENV];
	if (on) {
		process.env[RUST_CORE_ENV] = '1';
	} else {
		delete process.env[RUST_CORE_ENV];
	}
	try {
		return await fn();
	} finally {
		if (before === undefined) {
			delete process.env[RUST_CORE_ENV];
		} else {
			process.env[RUST_CORE_ENV] = before;
		}
	}
}

/**
 * The input of `mlRuleTest` linted on the Rust engine.
 *
 * @throws When the Rust engine did not lint it, because it fell back to the TypeScript engine.
 */
export async function lintWithRust(original: MarkuplintModule, args: RuleTestArgs) {
	const watch = watchFallbacks();
	try {
		const result = await withRustCore(true, () => original.mlRuleTest(...args));
		if (watch.fallbacks.length > 0) {
			throw new Error(`The Rust engine did not lint this: ${watch.fallbacks.join(' / ')}`);
		}
		return result;
	} finally {
		watch.stop();
	}
}

/**
 * Proves that the environment variable switches the testing API to the Rust engine. If the name of
 * the variable were not the one `markuplint` reads, every run would be on the TypeScript engine, with
 * no warning to watch for, and would pass.
 *
 * The probe is an input the two engines read differently, which `KNOWN_DIVERGENCES` of `setup.ts`
 * explains: a `<div>` inside a `<select>`. The TypeScript engine's parse5 drops it into the text of
 * the `select`, so `permitted-contents` reports nothing; the Rust HTML parser keeps it an element,
 * and the rule reports it. When the TypeScript engine reads it as the Rust one does, this probe has
 * to be replaced by another input that the two read differently.
 *
 * @throws When the lint with the variable on does not report it, or the one with it off does.
 */
export async function assertRustCoreSwitch(original: MarkuplintModule) {
	const { default: presetRules } = await import('@markuplint/rules');
	const rule = presetRules['permitted-contents']!;
	const html = '<select><div></div></select>';
	const onRust = await withRustCore(true, () => original.mlRuleTest(rule, html));
	const onTypeScript = await withRustCore(false, () => original.mlRuleTest(rule, html));
	if (onRust.violations.length === 0) {
		throw new Error(`The testing API is not on the Rust engine: is ${RUST_CORE_ENV} the variable it reads?`);
	}
	if (onTypeScript.violations.length > 0) {
		throw new Error(
			'The TypeScript engine reads a <div> in a <select> as the Rust engine does: the probe of assertRustCoreSwitch() no longer tells them apart',
		);
	}
}
