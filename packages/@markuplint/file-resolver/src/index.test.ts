import FileResolver from './';

describe('FileResolver', () => {
	it('loadConfigFile', async () => {
		const filePath = `${__dirname}/../test/fixtures/001/package.json`;
		const file = await FileResolver.loadConfigFile(filePath);
		expect(file.config).toEqual({ dummy: true });
	});

	it('searchConfigFile', async () => {
		const filePath = `${__dirname}/../test/fixtures/001/target.html`;
		const file = await FileResolver.searchConfigFile(filePath);
		expect(file.config).toEqual({ dummy: true });
	});

	it('searchConfigFile recursiveExtends', async () => {
		const filePath = `${__dirname}/../test/fixtures/002/target.html`;
		const file = await FileResolver.searchConfigFile(filePath);
		expect(file.config).toEqual({ dummy: true, dummy2: false });
	});
});
