import { searchCoreRepository } from './search-core-repository.js';

/**
 * Used to conditionally offer the "Contribute to core" option in the CLI wizard.
 */
export async function isMarkuplintRepo() {
	const rootDir = await searchCoreRepository();
	return !!rootDir;
}
