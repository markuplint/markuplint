import type * as Api from '../api/index.js';

import presetRules from '@markuplint/rules';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { lint } from '../api/index.js';

import { mlRuleTest, mlTest, mlTestFile } from './index.js';

const nativeAddonIsBuilt = await import('@markuplint/core').then(
	mod => typeof mod.lintHtml === 'function',
	() => false,
);

const ENV = 'MARKUPLINT_EXPERIMENTAL_RUST_CORE';

vi.mock('../api/index.js', async importOriginal => {
	const original = await importOriginal<typeof Api>();
	return { ...original, lint: vi.fn(original.lint) };
});

/**
 * The testing API lints with the Rust engine (`experimentalRustCore`) while the environment variable
 * is on. A rule runs by its registered name, so it has to be the object of the registry of
 * `@markuplint/rules`.
 */
describe.skipIf(!nativeAddonIsBuilt)('the testing API on the Rust engine', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	/** Runs `fn` with the variable `value`, and gathers what was written on stderr. */
	const run = async <T>(value: string, fn: () => Promise<T>) => {
		vi.stubEnv(ENV, value);
		const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		try {
			const result = await fn();
			return { result, told: stderr.mock.calls.map(([chunk]) => String(chunk)).join('') };
		} finally {
			stderr.mockRestore();
		}
	};

	/** Runs `fn` on the TypeScript engine, then on the Rust engine. */
	const onBoth = async <T>(fn: () => Promise<T>) => ({ ts: await run('', fn), rust: await run('1', fn) });

	const noDuplicateId = presetRules['no-duplicate-id']!;
	const html = '<div id="a"><p id="a"></p></div>';

	it('mlRuleTest runs a built-in rule by its registered name', async () => {
		const { ts, rust } = await onBoth(() => mlRuleTest(noDuplicateId, html));

		expect(ts.result.violations).toHaveLength(1);
		expect(rust.result).toEqual(ts.result);
		expect(rust.told).toBe('');
	});

	it('mlRuleTest takes the config of the rule, the node rules, and the fix', async () => {
		const attrOrder = presetRules['attr-order']!;
		const fix = await onBoth(() =>
			mlRuleTest(attrOrder, '<div class="a" id="b"></div>', { rule: ['id', 'class'] }, true),
		);

		expect(fix.ts.result.violations).toHaveLength(1);
		expect(fix.ts.result.fixedCode).toBe('<div id="b" class="a"></div>');
		expect(fix.rust.result).toEqual(fix.ts.result);
		expect(fix.rust.told).toBe('');

		const nodeRule = await onBoth(() =>
			mlRuleTest(noDuplicateId, '<div id="a"></div><p id="a"></p>', {
				nodeRule: [{ selector: 'p', rule: true }],
			}),
		);

		expect(nodeRule.ts.result.violations).toHaveLength(1);
		expect(nodeRule.rust.result).toEqual(nodeRule.ts.result);
		expect(nodeRule.rust.told).toBe('');
	});

	it('mlRuleTest removes the ruleId, as it does on the TypeScript engine', async () => {
		const { result } = await run('1', () => mlRuleTest(noDuplicateId, html));

		expect(result.violations).toHaveLength(1);
		expect(result.violations[0]).not.toHaveProperty('ruleId');
	});

	it('mlRuleTest rejects a copy of a built-in rule, or a rule of the same name, as not a registered rule', async () => {
		// The registry's own object is the registered rule: a copy of it has the same shape and is not.
		await expect(mlRuleTest({ ...noDuplicateId }, html)).rejects.toThrow(TypeError);

		const sameName = {
			...noDuplicateId,
			async verify() {},
		};
		await expect(mlRuleTest(sameName, '<p></p>', { rule: true })).rejects.toThrow(TypeError);
	});

	it('mlTest lints with the built-in rules the config sets', async () => {
		const { ts, rust } = await onBoth(() => mlTest(html, { rules: { 'no-duplicate-id': true } }));

		expect(ts.result.violations).toHaveLength(1);
		expect(rust.result).toEqual(ts.result);
		expect(rust.told).toBe('');
	});

	it('mlTestFile lints a file target', async () => {
		const { ts, rust } = await onBoth(() =>
			mlTestFile({ sourceCode: html, name: 'a.html' }, { rules: { 'no-duplicate-id': true } }),
		);

		expect(ts.result.violations).toHaveLength(1);
		expect(rust.result).toEqual(ts.result);
		expect(rust.told).toBe('');
	});

	const rustCoreOptionOf = async (value: string) => {
		vi.mocked(lint).mockClear();
		// The option is what is read, so the lint itself is not run
		vi.mocked(lint).mockResolvedValueOnce([]);
		await run(value, () => mlTest('<p></p>', {}));
		expect(lint).toHaveBeenCalledTimes(1);
		return vi.mocked(lint).mock.calls[0]?.[1]?.experimentalRustCore;
	};

	it.each(['1', 'true'])('reads "%s" as on', async value => {
		expect(await rustCoreOptionOf(value)).toBe(true);
	});

	it.each(['', '0', 'false', 'TRUE', 'yes'])('reads "%s" as off', async value => {
		expect(await rustCoreOptionOf(value)).toBe(false);
	});
});
