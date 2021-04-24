import { testAsyncAndSyncLoadConfigFile, testAsyncAndSyncSearchConfigFile } from './test-utils';

describe('FileResolver', () => {
	it('loadConfigFile', async () => {
		const filePath = `${__dirname}/../test/fixtures/001/package.json`;
		await testAsyncAndSyncLoadConfigFile(filePath, {
			// @ts-expect-error
			dummy: true,
		});
	});

	it('searchConfigFile', async () => {
		const filePath = `${__dirname}/../test/fixtures/001/target.html`;
		await testAsyncAndSyncSearchConfigFile(filePath, {
			// @ts-expect-error
			dummy: true,
		});
	});

	it('searchConfigFile recursiveExtends', async () => {
		const filePath = `${__dirname}/../test/fixtures/002/target.html`;
		await testAsyncAndSyncSearchConfigFile(filePath, {
			// @ts-expect-error
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
					option: {
						OPTIONAL_PROP: 'OPTIONAL_VALUE',
					},
					value: 'VALUE',
				},
			},
			nodeRules: [
				{
					tagName: 'div',
					rules: {
						'rule__disable-for-div-tag': false,
					},
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

	it('searchConfigFile recursive closest config file', async () => {
		const filePath = `${__dirname}/../test/fixtures/003/dir/target.html`;
		await testAsyncAndSyncSearchConfigFile(filePath, {
			// @ts-expect-error
			dummy: true,
			dummy2: true,
			rules: {
				rule__enabled: false,
				rule__disabled: true,
				'rule__custom-setting': {
					severity: 'error',
					value: 'CHANGED_VALUE',
				},
				'rule__custom-setting-with-detail-option': {
					value: 'VALUE',
					option: {
						OPTIONAL_PROP: 'CHANGED_OPTIONAL_VALUE',
					},
				},
				additional_rule: {
					value: 'VALUE',
				},
			},
			nodeRules: [
				{
					tagName: 'div',
					rules: {
						'rule__disable-for-div-tag': false,
					},
				},
				{
					tagName: 'div',
					rules: {
						'rule__disable-for-div-tag': true,
					},
				},
				{
					tagName: 'a',
					rules: {
						'rule__enble-for-a-tag': true,
					},
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
});
