import FileResolver from './';

describe('FileResolver', () => {
	it('searchConfigFile', async () => {
		const filePath = `${__dirname}/../test/fixtures/001/target.html`;
		const file = await FileResolver.searchConfigFile(filePath, true);
		expect(file.config).toEqual({ dummy: true });
	});

	it('resolveConfigFile', async () => {
		const filePath = `${__dirname}/../test/fixtures/002/target.html`;
		const file = await FileResolver.resolveConfigFile(filePath);
		expect(file.config).toEqual({ dummy: true, dummy2: false });
	});
});
