import cosmiconfig from 'cosmiconfig';

const explorer = cosmiconfig('markuplint');

export async function search<T extends cosmiconfig.Config>(dir: string, cacheClear: boolean) {
	if (!cacheClear) {
		explorer.clearCaches();
	}
	const result = await explorer.search(dir);
	if (!result || result.isEmpty) {
		return null;
	}
	return {
		filePath: result.filepath,
		config: result.config as T,
	};
}

export async function load<T extends cosmiconfig.Config>(filePath: string, cacheClear: boolean) {
	if (!cacheClear) {
		explorer.clearCaches();
	}
	const result = await explorer.load(filePath);
	if (!result || result.isEmpty) {
		return null;
	}
	return {
		filePath: result.filepath,
		config: result.config as T,
	};
}
