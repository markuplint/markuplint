import { createRule, MLRule } from '@markuplint/ml-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MLEngine } from './ml-engine.js';

const nativeAddonIsBuilt = await import('@markuplint/core').then(
	mod => typeof mod.lintHtml === 'function',
	() => false,
);

/**
 * A rule given in the `rules` option of the API is run by the TypeScript engine only. The Rust
 * engine does not leave its violations out: the lint goes to the TypeScript engine, with the
 * warning of a plugin rule.
 */
describe.skipIf(!nativeAddonIsBuilt)('experimentalRustCore with the `rules` option', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const customRule = () =>
		new MLRule({
			name: 'my-rule',
			...createRule({
				defaultSeverity: 'error',
				async verify({ document, report }) {
					await document.walkOn('Element', el => {
						if (el.localName === 'p') {
							report({ scope: el, message: 'a p element' });
						}
					});
				},
			}),
		});

	const lint = async (options: {
		experimentalRustCore: boolean;
		rules?: readonly MLRule<any, any>[];
		noRules?: boolean;
		importPresetRules?: boolean;
	}) => {
		const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const file = await MLEngine.toMLFile({ sourceCode: '<p></p>', name: 'a.html' });
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			locale: 'en',
			config: { rules: { 'my-rule': true } },
			...options,
		});
		const logs: [string, string][] = [];
		engine.on('log', (phase, message) => logs.push([phase, message]));
		const result = await engine.exec();
		return {
			violations: (result?.violations ?? []).map(({ ruleId, message, line, col, raw }) => ({
				ruleId,
				message,
				line,
				col,
				raw,
			})),
			logs: logs.filter(([phase]) => phase === 'experimental-rust-core:fallback'),
			stderr: stderr.mock.calls.map(([chunk]) => String(chunk)).join(''),
		};
	};

	it('reports what the TypeScript engine reports, and tells the fallback', async () => {
		const ts = await lint({ experimentalRustCore: false, rules: [customRule()] });
		const rust = await lint({ experimentalRustCore: true, rules: [customRule()] });

		expect(ts.violations).toHaveLength(1);
		expect(rust.violations).toStrictEqual(ts.violations);
		expect(ts.stderr).toBe('');
		expect(rust.stderr).toContain('[experimental-rust-core]');
		expect(rust.stderr).toContain('"rules" option');
		expect(rust.logs).toHaveLength(1);
		expect(rust.logs[0]![1]).toContain('"rules" option');
	});

	it('does not fall back when no rule is given (an empty array)', async () => {
		const rust = await lint({ experimentalRustCore: true, rules: [] });

		expect(rust.stderr).not.toContain('[experimental-rust-core]');
		expect(rust.logs).toHaveLength(0);
	});

	it('does not fall back when `rules` is not given', async () => {
		const rust = await lint({ experimentalRustCore: true });

		expect(rust.stderr).not.toContain('[experimental-rust-core]');
		expect(rust.logs).toHaveLength(0);
	});

	it('does not fall back for `noRules`, which evaluates no rule on either engine', async () => {
		const rust = await lint({ experimentalRustCore: true, rules: [customRule()], noRules: true });

		expect(rust.violations).toStrictEqual([]);
		expect(rust.stderr).not.toContain('[experimental-rust-core]');
		expect(rust.logs).toHaveLength(0);
	});

	it('falls back whether the built-in rules are imported or not', async () => {
		const ts = await lint({ experimentalRustCore: false, rules: [customRule()], importPresetRules: false });
		const rust = await lint({ experimentalRustCore: true, rules: [customRule()], importPresetRules: false });

		expect(ts.violations).toHaveLength(1);
		expect(rust.violations).toStrictEqual(ts.violations);
		expect(rust.logs).toHaveLength(1);
	});
});
