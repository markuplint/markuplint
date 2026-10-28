import fs, { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { Ruleset } from '@markuplint/ml-core';
import { ConfigLoadError } from '@markuplint/shared';

import { jsonc } from 'jsonc';
import { afterEach, beforeEach, describe, test, expect, vi } from 'vitest';

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

test('Search goes up from a target whose directory does not exist', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const file = getFile(path.resolve(testDir, '013', 'packages', 'missing', 'deeper', 'target.html'));
	expect(await file.dirExists()).toBe(false);
	const provider = new ConfigProvider();
	const key = await provider.search(file);
	expect(key).toBe(path.resolve(testDir, '013', '.markuplintrc'));
	const configSet = await provider.resolve(file, [key]);
	expect(configSet.config).toStrictEqual({ key: '013/.markuplintrc' });
});

test('Search from a missing directory stops at the nearest ancestor that has a configuration', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const file = getFile(path.resolve(testDir, '013', 'packages', 'b', 'missing', 'target.html'));
	const provider = new ConfigProvider();
	const key = await provider.search(file);
	expect(key).toBe(path.resolve(testDir, '013', 'packages', 'b', 'package.json'));
	const configSet = await provider.resolve(file, [key]);
	expect(configSet.config).toStrictEqual({ key: '013/packages/b/package.json' });
});

test('A configuration created together with the missing directory is found by the next search without invalidate()', async () => {
	const tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), 'config-provider-missing-dir-')));
	try {
		const file = getFile(path.join(tmpDir, 'missing', 'target.html'));
		const provider = new ConfigProvider();
		// Whatever lies above the temporary directory, the missing directory gets what its existing
		// parent gets.
		const fromParent = await provider.search(getFile(path.join(tmpDir, 'target.html')));
		expect(await provider.search(file)).toBe(fromParent);

		const created = path.join(tmpDir, 'missing', '.markuplintrc');
		await mkdir(path.join(tmpDir, 'missing'));
		await writeFile(created, '{ "key": "created" }');

		expect(await provider.search(file)).toBe(created);
	} finally {
		await rm(tmpDir, { recursive: true, force: true });
	}
});

test('Search goes up from a target whose directory is below a regular file', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	// `013/.markuplintrc` is a file, so `stat` on a directory below it fails with ENOTDIR on POSIX,
	// the case this test is for. Windows reports ENOENT there, which the search skips like any
	// missing directory, so on Windows this test passes without reaching the ENOTDIR branch.
	const file = getFile(path.resolve(testDir, '013', '.markuplintrc', 'sub', 'target.html'));
	const provider = new ConfigProvider();
	const key = await provider.search(file);
	expect(key).toBe(path.resolve(testDir, '013', '.markuplintrc'));
	const configSet = await provider.resolve(file, [key]);
	expect(configSet.config).toStrictEqual({ key: '013/.markuplintrc' });
});

test('A malformed configuration file in an ancestor directory is reported with its own path', async () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures');
	const file = getFile(path.resolve(testDir, '014', 'packages', 'a', 'target.html'));
	// `014/.markuplintrc` is neither valid JSON nor valid YAML (an unclosed flow mapping), so the
	// extensionless loader's YAML fallback throws; the error carries the path of that file, which
	// `cacheConfigError` reports instead of the directory being searched.
	await expect(new ConfigProvider().search(file)).rejects.toMatchObject({
		name: 'ConfigLoadError',
		filePath: path.resolve(testDir, '014', '.markuplintrc'),
	});
});

describe('A configuration file that cannot be imported is reported with its own path', () => {
	const testDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures', '016');
	// `016/.markuplintrc.js` throws when it is imported; the error carries the path of that file.
	const configFile = path.resolve(testDir, '.markuplintrc.js');
	const target = path.resolve(testDir, 'packages', 'a', 'target.html');
	// The path is followed by the line of the `throw` and a column. The cause in the middle is matched
	// as a substring: cosmiconfig falls back from `import()` to `require()`, and the runtime that
	// re-throws may add to its message.
	const message = (referrer: string) =>
		new RegExp(
			`^Failed to load ${RegExp.escape(configFile)}:1:\\d+: [\\s\\S]*016/\\.markuplintrc\\.js cannot be imported[\\s\\S]* in ${RegExp.escape(referrer)}$`,
		);

	test('found by the search from a nested package', async () => {
		const error = await new ConfigProvider().search(getFile(target)).catch((error: unknown) => error);
		expect(error).toBeInstanceOf(ConfigLoadError);
		expect(error).toMatchObject({
			filePath: configFile,
			referrer: target,
			message: expect.stringMatching(message(target)),
			cause: expect.objectContaining({
				message: expect.stringContaining('016/.markuplintrc.js cannot be imported'),
			}),
		});
	});

	test('given as the configuration file', async () => {
		const configSet = await new ConfigProvider().resolve(getFile(target), [configFile]);
		expect(configSet.errs).toStrictEqual([expect.any(ConfigLoadError)]);
		expect(configSet.errs[0]).toMatchObject({
			filePath: configFile,
			referrer: target,
			message: expect.stringMatching(message(target)),
		});
	});

	test('extended by another configuration file, which is named as the referrer', async () => {
		const extending = path.resolve(testDir, 'extends.json');
		const configSet = await new ConfigProvider().resolve(getFile(target), [extending]);
		expect(configSet.errs).toStrictEqual([expect.any(ConfigLoadError)]);
		expect(configSet.errs[0]).toMatchObject({
			filePath: configFile,
			referrer: extending,
			message: expect.stringMatching(message(extending)),
		});
	});
});

test.each([
	['JSON', '.markuplintrc.json', '{'],
	['YAML', '.markuplintrc.yaml', 'a: ['],
])('A malformed %s configuration file is named once in the message', async (format, name, content) => {
	const tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), 'config-provider-malformed-')));
	try {
		const configFile = path.join(tmpDir, name);
		const target = path.join(tmpDir, 'target.html');
		await writeFile(configFile, content);
		const error = await new ConfigProvider().search(getFile(target)).catch((error: unknown) => error);
		expect(error).toBeInstanceOf(ConfigLoadError);
		expect(error).toMatchObject({ filePath: configFile });
		// cosmiconfig's JSON and YAML loaders already begin the message with the path, so it is not
		// prefixed again. The parser's report follows on the next lines (a code frame for YAML), and
		// the referrer on a line of its own after it.
		const { message } = error as ConfigLoadError;
		expect(message).toMatch(new RegExp(`^${format} Error in ${RegExp.escape(configFile)}:\n[^\n]`));
		expect(message).toMatch(new RegExp(`\n in ${RegExp.escape(target)}$`));
		expect(message.split(configFile)).toHaveLength(2);
	} finally {
		await rm(tmpDir, { recursive: true, force: true });
	}
});

describe('A JavaScript configuration file that throws', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), 'config-provider-throws-')));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test('a message that contains the path of the file is still prefixed with its location', async () => {
		const configFile = path.join(tmpDir, '.markuplintrc.mjs');
		await writeFile(configFile, 'throw new Error(`bad option in ${import.meta.filename}`);\n');
		const error = await new ConfigProvider()
			.search(getFile(path.join(tmpDir, 'target.html')))
			.catch((error: unknown) => error);
		expect(error).toBeInstanceOf(ConfigLoadError);
		expect((error as ConfigLoadError).message).toMatch(
			new RegExp(
				`^Failed to load ${RegExp.escape(configFile)}:1:\\d+: bad option in ${RegExp.escape(configFile)} in `,
			),
		);
	});

	test('is not run again through require(), which some runtimes make rethrow a different error', async () => {
		const configFile = path.join(tmpDir, '.markuplintrc.mjs');
		const counter = `__markuplintConfigEvaluations_${path.basename(tmpDir).replaceAll('-', '_')}`;
		await writeFile(
			configFile,
			`globalThis.${counter} = (globalThis.${counter} ?? 0) + 1;\nthrow new Error('bad option');\n`,
		);
		try {
			const error = await new ConfigProvider()
				.search(getFile(path.join(tmpDir, 'target.html')))
				.catch((error: unknown) => error);
			expect(error).toBeInstanceOf(ConfigLoadError);
			expect(error).toMatchObject({ cause: { message: 'bad option' } });
			expect(Reflect.get(globalThis, counter)).toBe(1);
		} finally {
			Reflect.deleteProperty(globalThis, counter);
		}
	});

	test('a message that names a line of the file is not taken for the location of the throw', async () => {
		const configFile = path.join(tmpDir, '.markuplintrc.mjs');
		await writeFile(configFile, '// line 1\nthrow new Error(`bad option at ${import.meta.filename}:42`);\n');
		const error = await new ConfigProvider()
			.search(getFile(path.join(tmpDir, 'target.html')))
			.catch((error: unknown) => error);
		expect(error).toBeInstanceOf(ConfigLoadError);
		expect((error as ConfigLoadError).message).toMatch(
			new RegExp(`^Failed to load ${RegExp.escape(configFile)}:2:\\d+: bad option at `),
		);
	});

	test.each([
		['an object', '{ code: 1 }', '{ code: 1 }', { code: 1 }],
		['a string', "'bad option'", 'bad option', 'bad option'],
		['null', 'null', 'null', null],
		['undefined', 'undefined', 'undefined', undefined],
	])('%s, which is not an Error', async (_, thrown, shown, value) => {
		const configFile = path.join(tmpDir, '.markuplintrc.mjs');
		await writeFile(configFile, `throw ${thrown};\n`);
		const error = await new ConfigProvider()
			.search(getFile(path.join(tmpDir, 'target.html')))
			.catch((error: unknown) => error);
		expect(error).toBeInstanceOf(ConfigLoadError);
		expect(error).toMatchObject({
			filePath: configFile,
			message: `Failed to load ${configFile}: ${shown} in ${path.join(tmpDir, 'target.html')}`,
			cause: { cause: value },
		});
	});
});

test.each(['.markuplintrc', '.markuplintrc.jsonc'])(
	"A bug in markuplint's own loader of %s is not reported as the configuration's",
	async name => {
		const tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), 'config-provider-loader-bug-')));
		const spy = vi.spyOn(jsonc, 'parse').mockImplementation(() => {
			throw new TypeError('a bug in the loader');
		});
		try {
			await writeFile(path.join(tmpDir, name), '{}');
			const error = await new ConfigProvider()
				.search(getFile(path.join(tmpDir, 'target.html')))
				.catch((error: unknown) => error);
			expect(error).toBeInstanceOf(TypeError);
			expect(error).toMatchObject({ message: 'a bug in the loader' });
		} finally {
			spy.mockRestore();
			await rm(tmpDir, { recursive: true, force: true });
		}
	},
);

test('A configuration file that fails in a file it imports keeps both files among the loaded ones', async () => {
	const tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), 'config-provider-import-')));
	try {
		const configFile = path.join(tmpDir, 'a.json');
		const imported = path.join(tmpDir, 'b.yaml');
		await writeFile(configFile, JSON.stringify({ $import: ['./b.yaml'] }));
		await writeFile(imported, 'a: [');
		const configSet = await new ConfigProvider().resolve(getFile(path.join(tmpDir, 'target.html')), [configFile]);
		expect(configSet.errs).toStrictEqual([expect.any(ConfigLoadError)]);
		expect(configSet.errs[0]).toMatchObject({ filePath: imported, referrer: path.join(tmpDir, 'target.html') });
		expect([...configSet.files]).toStrictEqual([imported, configFile]);
	} finally {
		await rm(tmpDir, { recursive: true, force: true });
	}
});

describe('A configuration file found by the search whose `$import` fails is reported with the path of the file that declares it', () => {
	let tmpDir: string;
	let target: string;

	beforeEach(async () => {
		tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), 'config-provider-search-import-')));
		target = path.join(tmpDir, 'target.html');
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	const searchError = () => new ConfigProvider().search(getFile(target)).catch((error: unknown) => error);

	test('a target that does not exist, which does not pass the file over', async () => {
		const configFile = path.join(tmpDir, '.markuplintrc.json');
		await writeFile(configFile, JSON.stringify({ $import: ['./missing.json'] }));
		const error = await searchError();
		expect(error).toBeInstanceOf(ConfigLoadError);
		expect(error).toMatchObject({
			filePath: configFile,
			message: expect.stringMatching(
				new RegExp(
					`^Failed to load ${RegExp.escape(configFile)}: Cannot import \\./missing\\.json: .*ENOENT.* in ${RegExp.escape(target)}$`,
				),
			),
			cause: expect.objectContaining({ cause: expect.objectContaining({ code: 'ENOENT' }) }),
		});
	});

	test('the file itself', async () => {
		const configFile = path.join(tmpDir, '.markuplintrc.json');
		await writeFile(configFile, JSON.stringify({ $import: ['./.markuplintrc.json'] }));
		const error = await searchError();
		expect(error).toBeInstanceOf(ConfigLoadError);
		expect(error).toMatchObject({
			filePath: configFile,
			message: `Self-import detected in ${configFile} in ${target}`,
		});
	});

	test('a cycle, named by the file whose `$import` closes it', async () => {
		const configFile = path.join(tmpDir, '.markuplintrc.json');
		const imported = path.join(tmpDir, 'b.json');
		await writeFile(configFile, JSON.stringify({ $import: ['./b.json'] }));
		await writeFile(imported, JSON.stringify({ $import: ['./.markuplintrc.json'] }));
		const error = await searchError();
		expect(error).toBeInstanceOf(ConfigLoadError);
		expect(error).toMatchObject({
			filePath: imported,
			message: `Circular import detected:\n1. ${configFile}\n2. ${imported}\n3. ${configFile} (same as 1.) in ${target}`,
		});
	});

	test('a target that does not exist, which is among the loaded files so that its creation is noticed', async () => {
		const configFile = path.join(tmpDir, 'a.json');
		await writeFile(configFile, JSON.stringify({ $import: ['./missing.json'] }));
		const configSet = await new ConfigProvider().resolve(getFile(target), [configFile]);
		expect(configSet.errs).toStrictEqual([expect.any(ConfigLoadError)]);
		expect([...configSet.files]).toStrictEqual([path.join(tmpDir, 'missing.json'), configFile]);
	});

	test('a target that does not exist, declared in the `markuplint` field of a package file', async () => {
		const configFile = path.join(tmpDir, 'package.yaml');
		await writeFile(configFile, 'markuplint:\n  $import: [./missing.json]\n');
		const configSet = await new ConfigProvider().resolve(getFile(target), [configFile]);
		expect(configSet.errs).toStrictEqual([expect.any(ConfigLoadError)]);
		expect(configSet.errs[0]).toMatchObject({
			filePath: configFile,
			message: expect.stringMatching(new RegExp(`^Failed to load ${RegExp.escape(configFile)}: Cannot import `)),
		});
	});

	test("a bug in markuplint's own check of the targets, which is not reported as the configuration's", async () => {
		await writeFile(path.join(tmpDir, '.markuplintrc.json'), JSON.stringify({ $import: ['./b.json'] }));
		await writeFile(path.join(tmpDir, 'b.json'), '{}');
		const spy = vi.spyOn(fs, 'open').mockRejectedValue(new TypeError('a bug in the check'));
		try {
			const error = await searchError();
			expect(error).toBeInstanceOf(TypeError);
			expect(error).toMatchObject({ message: 'a bug in the check' });
		} finally {
			spy.mockRestore();
		}
	});

	test('a value that is not a string', async () => {
		const configFile = path.join(tmpDir, '.markuplintrc.json');
		await writeFile(configFile, JSON.stringify({ $import: [1] }));
		const error = await searchError();
		expect(error).toBeInstanceOf(ConfigLoadError);
		expect(error).toMatchObject({
			filePath: configFile,
			message: `${configFile}: Key $import must contain a string or a list of strings in ${target}`,
		});
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
