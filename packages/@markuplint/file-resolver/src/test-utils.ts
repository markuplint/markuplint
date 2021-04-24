import * as FileResolver from './';

export async function testAsyncAndSyncLoadConfigFile(filePath: string, result: FileResolver.Config) {
	[await FileResolver.loadConfigFile(filePath), FileResolver.loadConfigFileSync(filePath)].forEach(file => {
		if (!file) {
			throw new Error();
		}
		expect(file.config).toEqual(result);
	});
}

export async function testAsyncAndSyncSearchConfigFile(filePath: string, result: FileResolver.Config) {
	[await FileResolver.searchConfigFile(filePath), FileResolver.searchConfigFileSync(filePath)].forEach(file => {
		if (!file) {
			throw new Error();
		}
		expect(file.config).toEqual(result);
	});
}
