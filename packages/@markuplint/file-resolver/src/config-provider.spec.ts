import { configProvider } from './config-provider';
import { getFile } from './get-file';
import path from 'path';

it('001 + 002', async () => {
	const key = path.resolve(__dirname, '..', 'test', 'fixtures', '002', '.markuplintrc.json');
	await configProvider.load(key);
	const configSet = await configProvider.resolve([key]);
	expect(configSet.config).toStrictEqual({
		dummy: true,
		dummy2: false,
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
	const filePath = path.resolve(__dirname, '..', 'test', 'fixtures', '003', 'dir', 'target.html');
	const file = getFile(filePath);
	const key = await configProvider.search(file);
	const configSet = await configProvider.resolve([key]);
	expect(configSet.config).toStrictEqual({
		dummy: true,
		dummy2: true,
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
