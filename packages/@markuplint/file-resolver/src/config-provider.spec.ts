import path from 'path';

import { configProvider } from './config-provider';
import { getFile } from './ml-file';

it('001 + 002', async () => {
	const testDir = path.resolve(__dirname, '..', 'test', 'fixtures');
	const key = path.resolve(testDir, '002', '.markuplintrc.json');
	await configProvider.load(key);
	const configSet = await configProvider.resolve([key]);
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
	const filePath = path.resolve(testDir, '003', 'dir', 'target.html');
	const file = getFile(filePath);
	const key = await configProvider.search(file);
	const configSet = await configProvider.resolve([key]);
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
			rule__enabled: true,
			rule__disabled: true,
			'rule__custom-setting': {
				severity: 'error',
				value: 'CHANGED_VALUE',
			},
			'rule__custom-setting-with-detail-option': {
				value: 'VALUE',
				option: { OPTIONAL_PROP: 'CHANGED_OPTIONAL_VALUE' },
			},
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
