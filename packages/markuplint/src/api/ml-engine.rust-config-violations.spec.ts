import type { Config, Violation } from '@markuplint/ml-config';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { MLEngine } from './ml-engine.js';

const nativeAddonIsBuilt = await import('@markuplint/core').then(
	mod => typeof mod.lintHtml === 'function',
	() => false,
);

/** Lints on one engine; the Rust one must not have fallen back to the TypeScript one. */
const lint = async (sourceCode: string, config: Config, rust: boolean): Promise<readonly Violation[]> => {
	const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
	try {
		const file = await MLEngine.toMLFile({ sourceCode, name: 'a.html' });
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			locale: 'en',
			experimentalRustCore: rust,
			config,
		});
		const result = await engine.exec();
		expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join('')).not.toContain('[experimental-rust-core]');
		return result?.violations ?? [];
	} finally {
		stderr.mockRestore();
	}
};

const summarize = (violations: readonly Violation[]) =>
	violations.map(v => `${v.line}:${v.col} ${v.severity} ${v.ruleId} ${v.message}`);

/**
 * A config set through the API is named by a number that counts up in the process, so each engine
 * of a pair has a different one in a message that names it.
 */
const withoutConfigNumber = (summary: readonly string[]) =>
	summary.map(line => line.replace(/ in \d+$/, ' in <config>'));

/**
 * The reason that the selector parser gives for a selector it cannot read is its wording, which a
 * release of it may change: a fixed expectation names the selector and not the reason. The two
 * engines are still compared with the reason, as they must say the same.
 */
const withoutReason = (summary: readonly string[]) =>
	summary.map(line => line.replace(/(Invalid selector: ".*?") \(.*\)/, '$1 (<reason>)'));

/**
 * The Rust engine reports what `MLCore#verify` reports of a config before it runs a rule: a rule
 * that is not found, and the errors of the config and of expanding the named rules.
 */
describe.skipIf(!nativeAddonIsBuilt)(
	'experimentalRustCore reports the config the way the TypeScript engine does',
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		const source = '<div id="a"></div><div id="a"></div><img>';

		it.each([
			['a rule the config sets', { rules: { 'no-duplicate-id': true } }],
			['a deprecated rule name', { rules: { 'deprecated-attr': true } }],
			['a rule that does not exist', { rules: { 'no-such-rule': true } }],
			[
				'a rule that does not exist and a rule that does',
				{ rules: { 'no-such-rule': true, 'no-duplicate-id': true } },
			],
			[
				'a named node rule without a scope',
				{ nodeRules: [{ name: 'nosep', selector: 'p', rules: { 'no-duplicate-id': true } }] },
			],
			['a named rule group whose base rule is not found', { rules: { 'code-styles/no-such-base': true } }],
			['a plugin that the configuration still names', { plugins: ['no-such-plugin-xyz'] }],
			[
				'a namespace wildcard of a node rule that is not false',
				{ nodeRules: [{ selector: 'div', rules: { 'a11y/*': true } }] },
			],
			[
				'a namespace wildcard of a child node rule that is not false',
				{ childNodeRules: [{ selector: 'body', rules: { 'a11y/*': true } }] },
			],
			['a namespace wildcard that is false', { nodeRules: [{ selector: 'div', rules: { 'a11y/*': false } }] }],
			[
				'a namespace wildcard that is false and covers a named rule group',
				{
					rules: { 'x/dup': { rules: { 'no-duplicate-id': true } } },
					nodeRules: [{ selector: 'div', rules: { 'x/*': false } }],
				},
			],
			[
				'a namespace wildcard that is false and covers another namespace',
				{
					rules: { 'x/dup': { rules: { 'no-duplicate-id': true } } },
					nodeRules: [{ selector: 'div', rules: { 'y/*': false } }],
				},
			],
			['a namespaced key that is not a named rule group', { rules: { 'x/no-duplicate-id': true } }],
			[
				'a selector of a node rule that cannot be read',
				{ nodeRules: [{ selector: 'p[', rules: { 'no-duplicate-id': true } }] },
			],
			[
				'a selector of a child node rule that cannot be read',
				{ childNodeRules: [{ selector: 'p[', rules: { 'no-duplicate-id': true } }] },
			],
		] as const)('has the violations that the TypeScript engine has for %s', async (_name, config) => {
			const expected = await lint(source, config as Config, false);
			const actual = await lint(source, config as Config, true);

			expect(withoutConfigNumber(summarize(actual))).toStrictEqual(withoutConfigNumber(summarize(expected)));
		});

		it('reports a namespace wildcard that is not false once for each element the node rule matches', async () => {
			const config: Config = { nodeRules: [{ selector: 'div', rules: { 'a11y/*': true } }] };
			const message =
				'1:1 warning config-error Namespace wildcard "a11y/*" only accepts false; use a specific rule name for options';

			expect(summarize(await lint(source, config, false))).toStrictEqual([message, message]);
			expect(summarize(await lint(source, config, true))).toStrictEqual([message, message]);
		});

		it('disables the rules of a namespace for the elements a node rule with a wildcard that is false matches', async () => {
			const disabled: Config = {
				rules: { 'x/dup': { rules: { 'no-duplicate-id': true } } },
				nodeRules: [{ selector: 'div', rules: { 'x/*': false } }],
			};
			const kept: Config = { ...disabled, nodeRules: [{ selector: 'div', rules: { 'y/*': false } }] };

			for (const rust of [false, true]) {
				expect(summarize(await lint(source, disabled, rust))).toStrictEqual([]);
				expect((await lint(source, kept, rust)).map(v => v.ruleId)).toStrictEqual(['no-duplicate-id']);
			}
		});

		it('reports a rule that does not exist as not found', async () => {
			const config: Config = { rules: { 'no-such-rule': true } };

			expect(summarize(await lint(source, config, false))).toStrictEqual([
				'1:1 warning config-error Rule not found: no-such-rule',
			]);
			expect(summarize(await lint(source, config, true))).toStrictEqual([
				'1:1 warning config-error Rule not found: no-such-rule',
			]);
		});

		it('fails the document for a selector it cannot read as the TypeScript engine does, with no rule run', async () => {
			const config: Config = { nodeRules: [{ selector: 'p[', rules: { 'no-duplicate-id': true } }] };
			const expected = await lint(source, config, false);
			const actual = await lint(source, config, true);

			expect(withoutReason(summarize(expected))).toStrictEqual([
				'1:0 error parse-error Invalid selector: "p[" (<reason>) in the configuration',
			]);
			expect(summarize(actual)).toStrictEqual(summarize(expected));
		});

		it('does not fail a document with no element for a selector it cannot read, as the TypeScript engine does', async () => {
			const config: Config = { nodeRules: [{ selector: 'p[', rules: { 'no-duplicate-id': true } }] };
			const expected = await lint('<!-- c -->', config, false);
			const actual = await lint('<!-- c -->', config, true);

			expect(expected.map(v => v.ruleId)).not.toContain('parse-error');
			expect(withoutConfigNumber(summarize(actual))).toStrictEqual(withoutConfigNumber(summarize(expected)));
		});

		it('has the violations that the TypeScript engine has for a pretender with a selector it cannot read', async () => {
			const config: Config = { pretenders: [{ selector: 'My[', as: { element: 'button' } }] };
			const expected = await lint(source, config, false);
			const actual = await lint(source, config, true);

			expect(withoutReason(withoutConfigNumber(summarize(expected)))).toStrictEqual([
				'1:1 warning config-error Invalid selector: "My[" (<reason>) in <config>',
			]);
			expect(withoutConfigNumber(summarize(actual))).toStrictEqual(withoutConfigNumber(summarize(expected)));
		});
	},
);
