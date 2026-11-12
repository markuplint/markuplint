import { createRule, MLRule } from '@markuplint/ml-core';
import presetRules from '@markuplint/rules';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mlRuleTest, mlTest, mlTestFile } from './index.js';

const nativeAddonIsBuilt = await import('@markuplint/core').then(
	mod => typeof mod.lintHtml === 'function',
	() => false,
);

const ENV = 'MARKUPLINT_EXPERIMENTAL_RUST_CORE';
const FALLBACK = '[experimental-rust-core]';

/**
 * The testing API lints with the Rust engine (`experimentalRustCore`) while the environment variable
 * is on. A rule that is one of the built-in ones (the object of the registry of `@markuplint/rules`)
 * runs by its registered name; any other is a custom rule, which only the TypeScript engine runs.
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

	const customRule = (): MLRule<any, any> =>
		new MLRule<any, any>({
			name: 'my-rule',
			...createRule<boolean>({
				defaultSeverity: 'error',
				async verify({ document, report }) {
					await document.walkOn('Element', el => {
						report({ scope: el, message: 'an element' });
					});
				},
			}),
		});

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

	it('mlRuleTest runs a custom rule on the TypeScript engine, and tells the fallback', async () => {
		const custom = createRule({
			defaultSeverity: 'error',
			async verify({ document, report }) {
				await document.walkOn('Element', el => {
					report({ scope: el, message: 'an element' });
				});
			},
		});
		const { ts, rust } = await onBoth(() => mlRuleTest(custom, '<p></p>'));

		expect(ts.result.violations).toHaveLength(1);
		expect(rust.result).toEqual(ts.result);
		expect(ts.told).toBe('');
		expect(rust.told).toContain(FALLBACK);
	});

	it('mlRuleTest takes a copy of a built-in rule, or a rule of the same name, for a custom rule', async () => {
		// The registry's own object is the built-in rule: a copy of it has the same shape and is not.
		const copy = await onBoth(() => mlRuleTest({ ...noDuplicateId }, html));

		expect(copy.ts.result.violations).toHaveLength(1);
		expect(copy.rust.result).toEqual(copy.ts.result);
		expect(copy.rust.told).toContain(FALLBACK);

		const sameName = createRule({
			defaultSeverity: 'error',
			async verify({ document, report }) {
				await document.walkOn('Element', el => {
					report({ scope: el, message: 'no-duplicate-id' });
				});
			},
		});
		const named = await onBoth(() => mlRuleTest(sameName, '<p></p>', { rule: true }));

		expect(named.rust.result).toEqual(named.ts.result);
		expect(named.rust.told).toContain(FALLBACK);
	});

	it('mlRuleTest takes the locale of a custom rule on the TypeScript engine', async () => {
		const custom = createRule({
			defaultSeverity: 'error',
			async verify({ document, report, t }) {
				await document.walkOn('Element', el => {
					report({ scope: el, message: t('{0} is {1}', 'the element', 'duplicated') });
				});
			},
		});
		const { ts, rust } = await onBoth(() => mlRuleTest(custom, '<p></p>', { rule: true }, false, 'ja'));

		expect(ts.result.violations).toHaveLength(1);
		expect(rust.result).toEqual(ts.result);
		expect(rust.told).toContain(FALLBACK);
	});

	it('mlTest lints with the built-in rules the config sets', async () => {
		const { ts, rust } = await onBoth(() => mlTest(html, { rules: { 'no-duplicate-id': true } }));

		expect(ts.result.violations).toHaveLength(1);
		expect(rust.result).toEqual(ts.result);
		expect(rust.told).toBe('');
	});

	it('mlTest with custom rules runs on the TypeScript engine, and tells the fallback', async () => {
		const { ts, rust } = await onBoth(() => mlTest('<p></p>', { rules: { 'my-rule': true } }, [customRule()]));

		expect(ts.result.violations).toHaveLength(1);
		expect(rust.result).toEqual(ts.result);
		expect(rust.told).toContain(FALLBACK);
	});

	it('mlTestFile lints a file target', async () => {
		const { ts, rust } = await onBoth(() =>
			mlTestFile({ sourceCode: html, name: 'a.html' }, { rules: { 'no-duplicate-id': true } }),
		);

		expect(ts.result.violations).toHaveLength(1);
		expect(rust.result).toEqual(ts.result);
		expect(rust.told).toBe('');
	});

	it('mlTestFile with custom rules runs on the TypeScript engine, and tells the fallback', async () => {
		const { ts, rust } = await onBoth(() =>
			mlTestFile({ sourceCode: '<p></p>', name: 'a.html' }, { rules: { 'my-rule': true } }, [customRule()]),
		);

		expect(ts.result.violations).toHaveLength(1);
		expect(rust.result).toEqual(ts.result);
		expect(rust.told).toContain(FALLBACK);
	});

	it.each(['1', 'true'])('reads "%s" as on', async value => {
		const { told } = await run(value, () => mlTest('<p></p>', {}, [customRule()]));

		expect(told).toContain(FALLBACK);
	});

	it.each(['', '0', 'false', 'TRUE', 'yes'])('reads "%s" as off', async value => {
		const { told } = await run(value, () => mlTest('<p></p>', {}, [customRule()]));

		expect(told).not.toContain(FALLBACK);
	});
});
