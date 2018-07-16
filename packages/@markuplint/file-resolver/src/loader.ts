import cosmiconfig from 'cosmiconfig';

const explorer = cosmiconfig('markuplint');

export async function search(dir: string, cacheClear: boolean) {
	if (!cacheClear) {
		explorer.clearCaches();
	}
	const result = await explorer.search(dir);
	if (!result || result.isEmpty) {
		return null;
	}
	return {
		filePath: result.filepath,
		config: result.config,
	};
}

export async function load(filePath: string, cacheClear: boolean) {
	if (!cacheClear) {
		explorer.clearCaches();
	}
	const result = await explorer.load(filePath);
	if (!result || result.isEmpty) {
		return null;
	}
	return {
		filePath: result.filepath,
		config: result.config,
	};
}
