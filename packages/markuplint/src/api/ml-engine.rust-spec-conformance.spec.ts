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
		const engine = new MLEngine(file!, { noSearchConfig: true, locale: 'en', experimentalRustCore: rust, config });
		const result = await engine.exec();
		expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join('')).not.toContain('[experimental-rust-core]');
		return result?.violations ?? [];
	} finally {
		stderr.mockRestore();
	}
};

/**
 * A named rule group and a named node rule declare the conformance level of what they report, which
 * the violation carries (`Violation#specConformance`) and a consumer prints after the message.
 */
describe.skipIf(!nativeAddonIsBuilt)('specConformance of a violation', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each<readonly [name: string, sourceCode: string, config: Config, expected: readonly (string | undefined)[]]>([
		[
			'a named rule group',
			'<body accesskey="x"></body>',
			{
				rules: {
					'a11y/no-accesskey': {
						specConformance: 'non-normative',
						rules: { 'no-restricted-attr': { options: { disallowAttrs: ['accesskey'] } } },
					},
				},
			},
			['non-normative'],
		],
		[
			'a named rule group that declares none',
			'<body accesskey="x"></body>',
			{
				rules: {
					'a11y/no-accesskey': {
						rules: { 'no-restricted-attr': { options: { disallowAttrs: ['accesskey'] } } },
					},
				},
			},
			[undefined],
		],
		['a rule outside a group', '<p id="a"></p><p id="a"></p>', { rules: { 'no-duplicate-id': true } }, [undefined]],
		[
			'a named node rule',
			'<div class="INVALID"></div>',
			{
				nodeRules: [
					{
						name: 'custom/div-naming',
						specConformance: 'normative',
						selector: 'div',
						rules: { 'class-naming': '/^[a-z]+$/' },
					},
				],
			},
			['normative'],
		],
		[
			'a named node rule with more than one rule',
			'<div class="INVALID" id="a" id="b"></div>',
			{
				nodeRules: [
					{
						name: 'custom/div',
						specConformance: 'non-normative',
						selector: 'div',
						rules: { 'class-naming': '/^[a-z]+$/', 'no-duplicate-attr': true },
					},
				],
			},
			['non-normative', 'non-normative'],
		],
		[
			'a named child node rule',
			'<ul><li class="INVALID"></li></ul>',
			{
				childNodeRules: [
					{
						name: 'custom/li',
						specConformance: 'normative',
						selector: 'ul',
						rules: { 'class-naming': '/^[a-z]+$/' },
					},
				],
			},
			['normative'],
		],
		[
			'a named rule group with a severity',
			'<body accesskey="x"></body>',
			{
				rules: {
					'a11y/no-accesskey': {
						specConformance: 'normative',
						severity: 'warning',
						rules: { 'no-restricted-attr': { options: { disallowAttrs: ['accesskey'] } } },
					},
				},
			},
			['normative'],
		],
		[
			// The merge of the config keeps the last entry of a name, so what the engines get is one entry
			'node rules that share a name',
			'<div class="INVALID"></div><p class="INVALID"></p>',
			{
				nodeRules: [
					{
						name: 'custom/naming',
						specConformance: 'normative',
						selector: 'div',
						rules: { 'class-naming': '/^[a-z]+$/' },
					},
					{
						name: 'custom/naming',
						specConformance: 'non-normative',
						selector: 'p',
						rules: { 'class-naming': '/^[a-z]+$/' },
					},
				],
			},
			['non-normative'],
		],
	])('is the same on both engines for %s', async (_name, sourceCode, config, expected) => {
		const ts = await lint(sourceCode, config, false);
		const rust = await lint(sourceCode, config, true);

		expect(ts.map(v => v.specConformance)).toStrictEqual(expected);
		expect(rust).toStrictEqual(ts);
	});
});
