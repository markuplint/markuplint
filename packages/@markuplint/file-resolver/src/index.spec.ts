import * as FileResolver from './';

describe('FileResolver', () => {
	it('loadConfigFile', async () => {
		const filePath = `${__dirname}/../test/fixtures/001/package.json`;
		const file = await FileResolver.loadConfigFile(filePath);
		if (!file) {
			throw new Error();
		}
		expect(file.config).toEqual({ dummy: true });
	});

	it('searchConfigFile', async () => {
		const filePath = `${__dirname}/../test/fixtures/001/target.html`;
		const file = await FileResolver.searchConfigFile(filePath);
		if (!file) {
			throw new Error();
		}
		expect(file.config).toEqual({ dummy: true });
	});

	it('searchConfigFile recursiveExtends', async () => {
		const filePath = `${__dirname}/../test/fixtures/002/target.html`;
		const file = await FileResolver.searchConfigFile(filePath);
		if (!file) {
			throw new Error();
		}
		expect(file.config).toEqual({
			dummy: true,
			dummy2: false,
			rules: {},
			nodeRules: [],
			childNodeRules: [],
		});
	});

	it('searchConfigFile recursive closest config file', async () => {
		const filePath = `${__dirname}/../test/fixtures/003/dir/target.html`;
		const file = await FileResolver.searchConfigFile(filePath);
		if (!file) {
			throw new Error();
		}
		expect(file.config).toEqual({
			dummy: true,
			dummy2: false,
			rules: {},
			nodeRules: [],
			childNodeRules: [],
		});
	});
});
