import path from 'path';

import { ConfigProvider } from './config-provider';
import { getFile } from './ml-file';

const configProvider = new ConfigProvider();

it('001 + 002', async () => {
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '002', '.markuplintrc.json');
	const file = getFile(path.resolve(testDir, '002', 'target.html'));
	const configSet = await configProvider.resolve(file, [key]);
	expect(configSet.config).toStrictEqual({
		dummy: true,
		dummy2: false,
		key: '002/.markuplintrc.json',
		plugins: [
			path.resolve(testDir, '001', 'a'),
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
		rules: {
			rule__enabled: true,
			rule__disabled: false,
			'rule__custom-setting': {
				severity: 'error',
				value: 'VALUE',
			},
			'rule__custom-setting-with-detail-option': {
				value: 'VALUE',
				option: { OPTIONAL_PROP: 'OPTIONAL_VALUE' },
			},
			'rule__custom-setting2': {
				severity: 'error',
				value: 'VALUE',
			},
		},
		nodeRules: [
			{
				tagName: 'div',
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

it('001 + 002 + 003', async () => {
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
			path.resolve(testDir, '001', 'a'),
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
			path.resolve(testDir, '..', 'plugins', '001.js'),
		],
		rules: {
			rule__enabled: false,
			rule__disabled: true,
			'rule__custom-setting': {
				severity: 'error',
				value: 'CHANGED_VALUE',
			},
			'rule__custom-setting-with-detail-option': {
				value: 'VALUE',
				option: { OPTIONAL_PROP: 'CHANGED_OPTIONAL_VALUE' },
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
				tagName: 'div',
				rules: { 'rule__disable-for-div-tag': false },
			},
			{
				tagName: 'div',
				rules: { 'rule__disable-for-div-tag': true },
			},
			{
				tagName: 'a',
				rules: { 'rule__enble-for-a-tag': true },
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

it('Deep target', async () => {
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
	expect(configSet.errs[0].message).toBe(`Circular reference detected: ${key}`);
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
