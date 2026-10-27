import type { ConfigLoadError } from '@markuplint/shared';

import path from 'node:path';

import { Ruleset } from '@markuplint/ml-core';

import { describe, test, expect, vi } from 'vitest';

import { autoLoadRules } from './auto-load-rules.js';
import { ConfigProvider } from './config-provider.js';
import { getFile } from './ml-file/index.js';

vi.mock('packaged-config', () => {
	return {
		default: {
			mock: true,
		},
	};
});

const configProvider = new ConfigProvider();

test('001 + 002', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '002', '.markuplintrc.json');
	const file = getFile(path.resolve(testDir, '002', 'target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.config).toStrictEqual({
		dummy: true,
		dummy2: false,
		key: '002/.markuplintrc.json',
		plugins: [
			{
				name: path.resolve(testDir, '001', 'a'),
			},
			{
				name: '@markuplint/file-resolver',
				foo: '002',
			},
			{
				name: path.resolve(testDir, '001', 'b'),
				foo: '001',
			},
			{
				name: path.resolve(testDir, '002', 'b'),
				foo: '002',
			},
		],
		pretenders: {
			files: path.resolve(testDir, '..', 'pretenders.json'),
			data: [
				{
					selector: 'MyComponent',
					as: 'div',
				},
			],
		},
		rules: {
			rule__enabled: true,
			rule__disabled: false,
			'rule__custom-setting': {
				severity: 'error',
				value: 'VALUE',
			},
			'rule__custom-setting-with-detail-option': {
				value: 'VALUE',
				options: { OPTIONAL_PROP: 'OPTIONAL_VALUE' },
			},
			'rule__custom-setting2': {
				severity: 'error',
				value: 'VALUE',
			},
		},
		nodeRules: [
			{
				selector: 'div',
				rules: { 'rule__disable-for-div-tag': false },
			},
		],
		childNodeRules: [
			{
				selector: '[data-attr^="value"]',
				inheritance: true,
				rules: {
					'rule__overwrite-setting-of-selector-matched-element': {
						value: 'OVERWROTE_VALUE',
					},
				},
			},
		],
	});
});

test('001 + 002 + 003', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const file = getFile(path.resolve(testDir, '003', 'dir', 'target.html'));
	const key = await configProvider.search(file);
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.config).toStrictEqual({
		___configs: 'test',
		dummy: true,
		dummy2: true,
		key: '003/.markuplintrc',
		key2: '001-2.js',
		plugins: [
			{
				name: path.resolve(testDir, '001', 'a'),
			},
			{
				name: '@markuplint/file-resolver',
				foo: '002',
			},
			{
				name: path.resolve(testDir, '001', 'b'),
				foo: '001',
			},
			{
				name: path.resolve(testDir, '002', 'b'),
				foo: '002',
			},
			{
				name: path.resolve(testDir, '..', 'plugins', '001.js'),
			},
		],
		pretenders: {
			files: path.resolve(testDir, '..', 'pretenders.json'),
			data: [
				{
					selector: 'MyComponent',
					as: 'div',
				},
			],
		},
		rules: {
			rule__enabled: false,
			rule__disabled: true,
			'rule__custom-setting': {
				severity: 'error',
				value: 'CHANGED_VALUE',
			},
			'rule__custom-setting-with-detail-option': {
				value: 'VALUE',
				options: { OPTIONAL_PROP: 'CHANGED_OPTIONAL_VALUE' },
			},
			'rule__custom-setting2': false,
			additional_rule: {
				value: 'VALUE',
			},
			xxx: 'yyy',
			zzz: {
				severity: 'error',
			},
		},
		nodeRules: [
			{
				selector: 'div',
				rules: { 'rule__disable-for-div-tag': false },
			},
			{
				selector: 'div',
				rules: { 'rule__disable-for-div-tag': true },
			},
			{
				selector: 'a',
				rules: { 'rule__enable-for-a-tag': true },
			},
		],
		childNodeRules: [
			{
				selector: '[data-attr^="value"]',
				inheritance: true,
				rules: {
					'rule__overwrite-setting-of-selector-matched-element': {
						value: 'OVERWROTE_VALUE',
					},
				},
			},
			{
				selector: '[data-attr^="value"]',
				inheritance: false,
				rules: {
					'rule__overwrite-setting-of-selector-matched-element': {
						value: 'OVERWROTE_VALUE',
					},
				},
			},
		],
	});
});

test('Deep target', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '004', 'dir', 'dir', 'dir', 'dir', 'dir', '.markuplintrc');
	const file = getFile(path.resolve(testDir, '004', 'dir', 'dir', 'dir', 'dir', 'dir', 'deep-target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.config).toStrictEqual({
		dir01: true,
		dir02: true,
		dir03: true,
		dir04: true,
		dir05: true,
		dir06: true,
	});
	expect(configSet.errs.length).toBe(1);
	expect(configSet.errs[0] instanceof ReferenceError).toBe(true);
	expect(configSet.errs[0]?.message).toBe(`Circular reference detected: ${key}`);
});

test('Import packaged config (Issue: #403)', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '005', '.markuplintrc');
	const file = getFile(path.resolve(testDir, '005', 'target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.config).toStrictEqual({
		mock: true,
	});
});

test('Overrides', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '006', '.markuplintrc');
	const file = getFile(path.resolve(testDir, '006', 'target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.config).toStrictEqual({
		rules: {
			foo: false,
		},
	});
});

test('Config Presets', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '007', '.markuplintrc');
	const file = getFile(path.resolve(testDir, '007', 'target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.config.rules?.['a11y/wai-aria/non-existent-role']).toStrictEqual({
		specConformance: 'normative',
		rules: { 'no-unknown-role': true },
	});
});

test('TypeScript (.markuplintrc.ts)', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '008', '.markuplintrc.ts');
	const file = getFile(path.resolve(testDir, '008', 'target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.config.rules?.foo).toBe(false);
});

test('TypeScript (markuplint.config.ts)', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '009', 'markuplint.config.ts');
	const file = getFile(path.resolve(testDir, '009', 'target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.config.rules?.foo).toBe(false);
});

test('Link', async () => {
	const configProvider = new ConfigProvider();
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures', '010');
	const start = path.resolve(testDir, 'a.json');
	const files = await configProvider.recursiveLoad(start, false, 'path/to/index.html');

	expect([...files.stack].map(f => path.relative(testDir, f))).toStrictEqual([
		'd.json',
		'404.json',
		'f.json',
		'e.json',
		'c.json',
		'b.json',
		'a.json',
	]);

	expect([...files.errs].map(e => path.relative(testDir, (e as ConfigLoadError).referrer))).toStrictEqual(['e.json']);
});

test('Overrides with OverrideMode', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const resetKey = path.resolve(testDir, '011', '.markuplintrc.reset.json');
	const mergeKey = path.resolve(testDir, '011', '.markuplintrc.merge.json');
	const htmlFile = getFile(path.resolve(testDir, '011', 'target.html'));
	const vueFile = getFile(path.resolve(testDir, '011', 'target.vue'));
	const pattern1 = await new ConfigProvider().resolve(htmlFile, [resetKey]);
	const pattern2 = await new ConfigProvider().resolve(htmlFile, [mergeKey]);
	const pattern3 = await new ConfigProvider().resolve(vueFile, [resetKey]);
	const pattern4 = await new ConfigProvider().resolve(vueFile, [mergeKey]);
	expect(pattern1.config.rules).toStrictEqual({
		foo: true,
		bar: true,
	});
	expect(pattern2.config.rules).toStrictEqual({
		foo: true,
		bar: true,
	});
	expect(pattern3.config.rules).toStrictEqual({
		foo: false,
	});
	expect(pattern4.config.rules).toStrictEqual({
		foo: false,
		bar: true,
	});
});

test('Overrides: multiple matching globs (reset mode) — last match replaces every earlier one outright', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '012', '.markuplintrc.multi-reset.json');
	const file = getFile(path.resolve(testDir, '012', 'target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	// `./target.*` matched after `./*.html`, so under the default `reset` mode
	// its config entirely replaces the first match's — `foo`/`bar` are gone.
	expect(configSet.config).toStrictEqual({
		rules: {
			baz: true,
		},
	});
	expect(configSet.appliedOverrides).toStrictEqual([
		path.resolve(testDir, '012', '*.html'),
		path.resolve(testDir, '012', 'target.*'),
	]);
});

test('Overrides: multiple matching globs (merge mode) — appliedOverrides records match order', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '012', '.markuplintrc.multi-merge.json');
	const file = getFile(path.resolve(testDir, '012', 'target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.config.rules).toStrictEqual({
		foo: false,
		bar: true,
		baz: true,
	});
	expect(configSet.appliedOverrides).toStrictEqual([
		path.resolve(testDir, '012', '*.html'),
		path.resolve(testDir, '012', 'target.*'),
	]);
});

test('appliedOverrides is absent when the config has no overrides at all', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '001', '.markuplintrc');
	const file = getFile(path.resolve(testDir, '001', 'target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.appliedOverrides).toBeUndefined();
});

test('appliedOverrides is absent when overrides exist but none match the target file', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '012', '.markuplintrc.no-match.json');
	const file = getFile(path.resolve(testDir, '012', 'target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.config.rules).toStrictEqual({ foo: true });
	expect(configSet.appliedOverrides).toBeUndefined();
});

test('Overrides remain per-file correct when sharing one ConfigProvider across files (#3997)', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const resetKey = path.resolve(testDir, '011', '.markuplintrc.reset.json');
	const htmlFile = getFile(path.resolve(testDir, '011', 'target.html'));
	const vueFile = getFile(path.resolve(testDir, '011', 'target.vue'));

	// Same ConfigProvider, same `names` (`resetKey`) for both files — the base
	// config is cached once, but each file's `overrides` match must still be
	// evaluated independently on every call.
	const sharedProvider = new ConfigProvider();

	// .vue resolves first, populating the shared base cache after resolving
	// an overrides-eligible target.
	const vueResult = await sharedProvider.resolve(vueFile, [resetKey]);
	expect(vueResult.config.rules).toStrictEqual({ foo: false });

	// .html resolves second, same `names` — must NOT inherit .vue's override.
	const htmlResult = await sharedProvider.resolve(htmlFile, [resetKey]);
	expect(htmlResult.config.rules).toStrictEqual({ foo: true, bar: true });
});

test('Overrides remain per-file correct when sharing one ConfigProvider, opposite resolve order (#3997)', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const resetKey = path.resolve(testDir, '011', '.markuplintrc.reset.json');
	const htmlFile = getFile(path.resolve(testDir, '011', 'target.html'));
	const vueFile = getFile(path.resolve(testDir, '011', 'target.vue'));

	const sharedProvider = new ConfigProvider();

	// .html resolves first, populating the shared base cache after resolving
	// a target with no override match.
	const htmlResult = await sharedProvider.resolve(htmlFile, [resetKey]);
	expect(htmlResult.config.rules).toStrictEqual({ foo: true, bar: true });

	// .vue resolves second, same `names` — must still get its own override.
	const vueResult = await sharedProvider.resolve(vueFile, [resetKey]);
	expect(vueResult.config.rules).toStrictEqual({ foo: false });
});

test('Base config resolution is cached and reused across files sharing one ConfigProvider (#3997)', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const resetKey = path.resolve(testDir, '011', '.markuplintrc.reset.json');
	const htmlFile = getFile(path.resolve(testDir, '011', 'target.html'));
	const vueFile = getFile(path.resolve(testDir, '011', 'target.vue'));

	const sharedProvider = new ConfigProvider();
	const htmlResult = await sharedProvider.resolve(htmlFile, [resetKey]);
	const vueResult = await sharedProvider.resolve(vueFile, [resetKey]);

	// Both calls resolve the same `names`; `files`/`plugins` must be the SAME
	// object across both results — proof the second call reused the cached
	// base config instead of redoing merge/validate/plugin-resolution.
	expect(vueResult.files).toBe(htmlResult.files);
	expect(vueResult.plugins).toBe(htmlResult.plugins);
});

test('set() reuses the same key for the same config object identity (#3997)', () => {
	const provider = new ConfigProvider();
	const inlineConfig = { rules: { foo: true } };

	const key1 = provider.set(inlineConfig);
	const key2 = provider.set(inlineConfig);
	expect(key2).toBe(key1);

	// A different object, even with identical content, still gets its own key.
	const key3 = provider.set({ rules: { foo: true } });
	expect(key3).not.toBe(key1);
});

test('set() with an explicit identity stabilizes the key across differently-merged values (#3997)', () => {
	const provider = new ConfigProvider();
	const identity = { rules: { foo: true } };

	const key1 = provider.set({ rules: { foo: true }, extends: ['a'] }, undefined, identity);
	const key2 = provider.set({ rules: { foo: true }, extends: ['b'] }, undefined, identity);
	expect(key2).toBe(key1);
});

test('resolve(cache: false) no longer clears entries registered via set() before the call (#4015)', async () => {
	const provider = new ConfigProvider();
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const file = getFile(path.resolve(testDir, '002', 'target.html'));

	// Mirrors `MLEngine#resolveConfig()`'s pattern: `set()` an inline config,
	// then immediately `resolve()` referencing that key with `cache: false`.
	const key = provider.set({ rules: { foo: true } });
	const configSet = await provider.resolve(file, [key], false);

	expect(configSet.config.rules).toStrictEqual({ foo: true });
});

test('invalidate() clears entries registered via set() (#4015)', async () => {
	const provider = new ConfigProvider();
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const file = getFile(path.resolve(testDir, '002', 'target.html'));

	const key = provider.set({ rules: { foo: true } });
	provider.invalidate();

	// The key only ever lived in the store; once cleared, resolving it falls
	// through to `#load()`, which treats it as a file path/module name.
	await expect(provider.resolve(file, [key], false)).rejects.toThrow(/is not an absolute path/);
});

test('runExclusive() serializes overlapping calls, deferring a later call until an earlier one settles (#4015)', async () => {
	// `MLEngine#resolveConfig()` wraps its whole invalidate → set → search →
	// resolve sequence in `runExclusive()` so that an overlapping call on the
	// same (possibly shared) provider can't run its own `invalidate()` in the
	// middle of another call's `set()`/`resolve()` sequence. This exercises
	// `runExclusive()`'s serialization directly, with the interleaving under
	// the test's own control instead of relying on incidental async timing.
	const provider = new ConfigProvider();
	const order: string[] = [];

	let releaseFirst: () => void = () => {};
	const firstGate = new Promise<void>(resolve => {
		releaseFirst = resolve;
	});

	const first = provider.runExclusive(async () => {
		order.push('first-start');
		await firstGate;
		order.push('first-end');
	});

	const second = provider.runExclusive(() => {
		order.push('second-start');
		order.push('second-end');
		return Promise.resolve();
	});

	releaseFirst();
	await Promise.all([first, second]);

	// If `runExclusive()` let the two calls run concurrently instead of
	// queueing, `second`'s callback (no internal `await`) would complete
	// before `first`'s gated one resumes, producing
	// ['first-start', 'second-start', 'second-end', 'first-end'] instead.
	// Asserting only on this final, fully-settled order (not on intermediate
	// state after N microtask ticks) keeps the assertion independent of a
	// runtime's exact `await` scheduling — relevant since this repo also
	// tests under Bun and Deno, not just Node/V8.
	expect(order).toStrictEqual(['first-start', 'first-end', 'second-start', 'second-end']);
});

test('invalidate() clears the auto-load rule cache so a cached miss is probed again', async () => {
	const provider = new ConfigProvider();
	const ruleset = new Ruleset({ rules: { 'not-installed': true } });

	const first = await autoLoadRules(ruleset);
	expect(first.errors.length).toBe(2);
	// Served from the cache: the same error objects, not a new probe
	expect((await autoLoadRules(ruleset)).errors[0]).toBe(first.errors[0]);

	provider.invalidate();

	const reprobed = await autoLoadRules(ruleset);
	expect(reprobed.errors.length).toBe(2);
	expect(reprobed.errors[0]).not.toBe(first.errors[0]);
});

test('Search goes up past a nested package.json without a markuplint field', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const file = getFile(path.resolve(testDir, '013', 'packages', 'a', 'target.html'));
	const provider = new ConfigProvider();
	const key = await provider.search(file);
	expect(key).toBe(path.resolve(testDir, '013', '.markuplintrc'));
	const configSet = await provider.resolve(file, [key]);
	expect(configSet.config).toStrictEqual({ key: '013/.markuplintrc' });
});

test('Search stops at the nearest nested package.json that has a markuplint field', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const file = getFile(path.resolve(testDir, '013', 'packages', 'b', 'target.html'));
	const provider = new ConfigProvider();
	const key = await provider.search(file);
	expect(key).toBe(path.resolve(testDir, '013', 'packages', 'b', 'package.json'));
	const configSet = await provider.resolve(file, [key]);
	expect(configSet.config).toStrictEqual({ key: '013/packages/b/package.json' });
});

test('Search goes up past a nested package.yaml', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const file = getFile(path.resolve(testDir, '013', 'packages', 'c', 'target.html'));
	const key = await new ConfigProvider().search(file);
	expect(key).toBe(path.resolve(testDir, '013', '.markuplintrc'));
});

test('A malformed configuration file in an ancestor directory is reported with its own path', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const file = getFile(path.resolve(testDir, '014', 'packages', 'a', 'target.html'));
	// `014/.markuplintrc` is neither valid JSON nor valid YAML (an unclosed flow mapping), so the
	// extensionless loader's YAML fallback throws; the error carries the path of that file, which
	// `cacheConfigError` reports instead of the directory being searched.
	await expect(new ConfigProvider().search(file)).rejects.toMatchObject({
		name: 'ConfigParserError',
		filePath: path.resolve(testDir, '014', '.markuplintrc'),
	});
});

describe('Relative paths are resolved from the directory of the configuration file that declares them', () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures', '015');
	const subDir = path.resolve(testDir, 'sub');

	test('a relative filePath of an inline pretender, keeping its line and column, with or without them', async () => {
		const file = getFile(path.resolve(subDir, 'other.txt'));
		const configSet = await new ConfigProvider().resolve(file, [path.resolve(subDir, 'base.json')]);
		expect(configSet.config.pretenders?.data).toStrictEqual([
			{ selector: 'Item', as: 'li', filePath: `${path.resolve(subDir, 'Item.tsx')}:1:17` },
			{ selector: 'Bare', as: 'li', filePath: path.resolve(subDir, 'Bare.tsx') },
			{ selector: 'Plain', as: 'div' },
		]);
	});

	test('a relative filePath of an inline pretender in a configuration that another one extends', async () => {
		const file = getFile(path.resolve(subDir, 'other.txt'));
		const configSet = await new ConfigProvider().resolve(file, [path.resolve(testDir, 'child.json')]);
		// The base is `sub/`, where `base.json` declares it, not the directory of the extending `child.json`.
		expect(configSet.config.pretenders?.data).toStrictEqual([
			{ selector: 'Item', as: 'li', filePath: `${path.resolve(subDir, 'Item.tsx')}:1:17` },
			{ selector: 'Bare', as: 'li', filePath: path.resolve(subDir, 'Bare.tsx') },
			{ selector: 'Plain', as: 'div' },
		]);
	});

	test('every path in the value of an override, while a module name is kept', async () => {
		const file = getFile(path.resolve(subDir, 'target.html'));
		const configSet = await new ConfigProvider().resolve(file, [path.resolve(testDir, 'child.json')]);
		expect(configSet.appliedOverrides).toStrictEqual([path.resolve(subDir, '*.html')]);
		// An override replaces the configuration outright in `reset` mode, so no key it does not hold may be added.
		expect(Object.keys(configSet.config).toSorted()).toStrictEqual([
			'excludeFiles',
			'parser',
			'plugins',
			'pretenders',
			'specs',
		]);
		expect(configSet.config).toMatchObject({
			// A module name stays as it is; only a path is resolved.
			parser: { '\\.x$': path.resolve(subDir, 'parser.js'), '\\.y$': '@markuplint/jsx-parser' },
			specs: { '\\.x$': path.resolve(subDir, 'spec.js') },
			plugins: [{ name: path.resolve(subDir, 'plugin.js') }],
			excludeFiles: [path.resolve(subDir, 'ignored/**'), `!${path.resolve(subDir, 'ignored/keep/**')}`],
			pretenders: {
				files: [path.resolve(subDir, 'pretenders.json')],
				scan: [
					{ files: path.resolve(subDir, 'components/*.tsx') },
					{ files: [path.resolve(subDir, 'ui/*.tsx'), path.resolve(subDir, 'ui/*.jsx')] },
				],
				data: [{ selector: 'Over', as: 'li', filePath: `${path.resolve(subDir, 'Over.tsx')}:3:4` }],
			},
		});
	});
});

describe('Plugins in the value of an override are loaded for the file it applies to', () => {
	const pluginsDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures', '015', 'plugins');
	const resolveFor = (config: string, target: string) =>
		new ConfigProvider().resolve(getFile(path.resolve(pluginsDir, target)), [path.resolve(pluginsDir, config)]);
	const names = (configSet: Awaited<ReturnType<typeof resolveFor>>) => configSet.plugins.map(p => p.name);

	test('a plugin that only the override declares', async () => {
		const matched = await resolveFor('override-only.json', 'target.html');
		expect(names(matched)).toStrictEqual(['foo']);
		expect(matched.errs).toStrictEqual([]);
	});

	test('no plugin for a file that the override does not apply to', async () => {
		const unmatched = await resolveFor('override-only.json', 'other.txt');
		expect(names(unmatched)).toStrictEqual([]);
	});

	test('the plugins of the base remain when an override replaces the configuration without declaring plugins', async () => {
		const matched = await resolveFor('reset-without-plugins.json', 'target.html');
		expect(names(matched)).toStrictEqual(['base-plugin']);
	});

	test('the plugins of the base come first, then those of the override, when the configurations are merged', async () => {
		const matched = await resolveFor('merge.json', 'target.html');
		expect(names(matched)).toStrictEqual(['base-plugin', 'foo']);
		expect(matched.errs).toStrictEqual([]);
	});

	test('a plugin of the override that is not found is reported for that file only', async () => {
		const provider = new ConfigProvider();
		const key = path.resolve(pluginsDir, 'missing.json');
		const matched = await provider.resolve(getFile(path.resolve(pluginsDir, 'target.html')), [key]);
		const unmatched = await provider.resolve(getFile(path.resolve(pluginsDir, 'other.txt')), [key]);
		expect(matched.errs.map(e => e.message)).toStrictEqual([
			`Plugin not found: ${path.resolve(pluginsDir, 'not-found.js')}`,
		]);
		expect(unmatched.errs).toStrictEqual([]);
	});
});
