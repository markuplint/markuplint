import path from 'node:path';

import { readPackageJson } from './read-package-json.js';

/**
 * Searches for the markuplint core monorepo root by traversing up from the
 * current working directory. Identifies the root by checking for a
 * `package.json` with the name `"markuplint-packages"`.
 *
 * @returns The absolute path to the monorepo root directory, or `null` if
 *          the current working directory is not within the markuplint repository.
 */
export async function searchCoreRepository() {
	const paths = path.resolve(process.cwd()).split(path.sep);

	while (true) {
		const currentDir = paths.join(path.sep);
		const name = await readPackageJson(currentDir);

		if (name === 'markuplint-packages') {
			return currentDir;
		}

		const dir = paths.pop();
		if (!dir) {
			return null;
		}
	}
}
