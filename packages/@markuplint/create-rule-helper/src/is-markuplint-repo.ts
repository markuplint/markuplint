import { searchCoreRepository } from './search-core-repository.js';

export async function isMarkuplintRepo() {
	const rootDir = await searchCoreRepository();
	return !!rootDir;
}
