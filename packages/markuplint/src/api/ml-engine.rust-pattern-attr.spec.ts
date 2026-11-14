import type { Violation } from '@markuplint/ml-config';

import { describe, expect, it, vi } from 'vitest';

import { MLEngine } from './ml-engine.js';

const nativeAddonIsBuilt = await import('@markuplint/core').then(
	mod =>
		typeof mod.lintHtml === 'function' &&
		typeof mod.setPatternValidator === 'function' &&
		typeof mod.patternValidatorRegistered === 'function',
	() => false,
);

/** Lints on one engine; the Rust one must not have fallen back to the TypeScript one. */
const lint = async (sourceCode: string, rust: boolean): Promise<readonly Violation[]> => {
	const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
	try {
		const file = await MLEngine.toMLFile({ sourceCode, name: 'a.html' });
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			locale: 'en',
			experimentalRustCore: rust,
			config: { rules: { 'no-invalid-attr-value': true } },
		});
		const result = await engine.exec();
		expect(result).toBeDefined();
		expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join('')).not.toContain('[experimental-rust-core]');
		return result!.violations;
	} finally {
		stderr.mockRestore();
	}
};

const lines = (violations: readonly Violation[]) =>
	violations.map(v => `${v.line}:${v.col} ${v.severity} ${v.ruleId} ${v.message}`);

/**
 * The value of `<input pattern>` is a regular expression that the HTML Standard compiles with
 * the `v` flag. The Rust engine has no JavaScript regular expression engine, so Node.js answers
 * through the validator that `MLEngine` registers with the native addon: the two engines must
 * say the same of every value.
 *
 * @see https://html.spec.whatwg.org/multipage/input.html#compiled-pattern-regular-expression
 */
describe.skipIf(!nativeAddonIsBuilt)(
	'experimentalRustCore validates the pattern attribute like the TypeScript engine',
	() => {
		const validOnlyWithV = String.raw`[\p{L}--[a-z]]`;
		const invalidOnlyWithV = ['[(]', 'a{', '{', String.raw`\-`, '[a-]'];
		const valid = [
			String.raw`(?=.*\d).{8,}`,
			String.raw`(a)\1`,
			String.raw`(?<year>\d{4})`,
			'[a-z]+',
			String.raw`[\-]`,
		];
		// `a)|(b` is valid only when wrapped as `^(?:a)|(b)$`; the value is compiled alone first
		const invalid = ['(', ']//[()?!+*', 'a)|(b'];

		it('registers the validator with the addon when the engine loads it', async () => {
			const addon = await import('@markuplint/core');
			await lint('<input pattern="[a-z]+">', true);
			expect(addon.patternValidatorRegistered()).toBe(true);
		});

		it.each([validOnlyWithV, ...valid])('accepts %s', async value => {
			const code = `<input pattern="${value}">`;
			expect(lines(await lint(code, false))).toStrictEqual([]);
			expect(lines(await lint(code, true))).toStrictEqual([]);
		});

		it.each([...invalidOnlyWithV, ...invalid])(
			'rejects %s, with the message of the TypeScript engine',
			async value => {
				const code = `<input pattern="${value}">`;
				const ts = lines(await lint(code, false));
				expect(ts).toHaveLength(1);
				expect(lines(await lint(code, true))).toStrictEqual(ts);
			},
		);
	},
);
