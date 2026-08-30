import type { ConfigLoadError } from '@markuplint/shared';

import path from 'node:path';

import { test, expect, vi } from 'vitest';

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
