import type { ConfigLoadError } from './config-load-error.js';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect, vi } from 'vitest';

import { ConfigProvider } from './config-provider.js';
import { getFile } from './ml-file/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

vi.mock('packaged-config', () => {
	return {
		default: {
			mock: true,
		},
	};
});

const configProvider = new ConfigProvider();

test('001 + 002', async () => {
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures');
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
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures');
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
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures');
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
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '005', '.markuplintrc');
	const file = getFile(path.resolve(testDir, '005', 'target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.config).toStrictEqual({
		mock: true,
	});
});

test('Overrides', async () => {
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures');
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
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '007', '.markuplintrc');
	const file = getFile(path.resolve(testDir, '007', 'target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.config.rules?.['wai-aria']).toBe(true);
});

test('TypeScript (.markuplintrc.ts)', async () => {
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '008', '.markuplintrc.ts');
	const file = getFile(path.resolve(testDir, '008', 'target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.config.rules?.foo).toBe(false);
});

test('TypeScript (markuplint.config.ts)', async () => {
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '009', 'markuplint.config.ts');
	const file = getFile(path.resolve(testDir, '009', 'target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.config.rules?.foo).toBe(false);
});

test('Link', async () => {
	const configProvider = new ConfigProvider();
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures', '010');
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
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures');
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

test('Search upward past a nested package.json without a markuplint key (#4405)', async () => {
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures');
	const file = getFile(path.resolve(testDir, '012', 'packages', 'a', 'target.html'));
	const provider = new ConfigProvider();
	const key = await provider.search(file);
	expect(key).toBe(path.resolve(testDir, '012', '.markuplintrc'));
	const configSet = await provider.resolve(file, [key]);
	expect(configSet.config).toStrictEqual({ key: '012/.markuplintrc' });
});

test('Search stops at the nearest nested package.json that has a markuplint key (#4405)', async () => {
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures');
	const file = getFile(path.resolve(testDir, '012', 'packages', 'b', 'target.html'));
	const provider = new ConfigProvider();
	const key = await provider.search(file);
	expect(key).toBe(path.resolve(testDir, '012', 'packages', 'b', 'package.json'));
	const configSet = await provider.resolve(file, [key]);
	expect(configSet.config).toStrictEqual({ key: '012/packages/b/package.json' });
});

test('Search upward past a nested package.yaml without a markuplint key (#4405)', async () => {
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures');
	const file = getFile(path.resolve(testDir, '012', 'packages', 'c', 'target.html'));
	const key = await new ConfigProvider().search(file);
	expect(key).toBe(path.resolve(testDir, '012', '.markuplintrc'));
});

test('A malformed configuration file in an ancestor directory is reported with its own path (#4405)', async () => {
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures');
	const file = getFile(path.resolve(testDir, '013', 'packages', 'a', 'target.html'));
	// `013/.markuplintrc` is neither valid JSON nor valid YAML (an unclosed flow mapping), so the
	// extensionless loader's YAML fallback throws and cosmiconfig reports the file's own path.
	await expect(new ConfigProvider().search(file)).rejects.toMatchObject({
		name: 'ConfigParserError',
		filePath: path.resolve(testDir, '013', '.markuplintrc'),
	});
});
