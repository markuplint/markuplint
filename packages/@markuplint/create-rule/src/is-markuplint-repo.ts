import { searchCoreRepository } from './search-core-repository.js';

/**
 * Determines whether the current working directory is inside the markuplint
 * core monorepo. This is used to conditionally offer the "Contribute to core"
 * option in the CLI wizard.
 *
 * @returns `true` if the cwd is within the markuplint monorepo, `false` otherwise.
 */
export async function isMarkuplintRepo() {
	const rootDir = await searchCoreRepository();
	return !!rootDir;
}
