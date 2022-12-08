import { searchCoreRepository } from './search-core-repository';

export async function isMarkuplintRepo() {
	const rootDir = await searchCoreRepository();
	return !!rootDir;
}
