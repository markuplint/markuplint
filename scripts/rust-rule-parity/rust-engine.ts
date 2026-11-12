/**
 * Lints the input of a rule spec with the Rust engine: shared by `setup.ts` (which asserts the spec's
 * expectations on the result) and `ja-setup.ts` (which compares the messages with the TypeScript
 * engine's).
 */

import type * as Markuplint from 'markuplint';

type MarkuplintModule = typeof Markuplint;
export type RuleTestArgs = Parameters<MarkuplintModule['mlRuleTest']>;

/**
 * The input of `mlRuleTest` linted with `experimentalRustCore`, the rule enabled by its registered
 * name. `locale` is the locale of the messages (the spec's own when it is omitted).
 *
 * @throws When the Rust engine did not lint it, because it fell back to the TypeScript engine. A pass
 *   must be the Rust engine's own result.
 */
export async function lintWithRust(original: MarkuplintModule, name: string, args: RuleTestArgs, locale?: string) {
	const [, sourceCode, config = { rule: true }, fix = false, specLocale = 'en'] = args;
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
			locale: locale ?? specLocale,
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
