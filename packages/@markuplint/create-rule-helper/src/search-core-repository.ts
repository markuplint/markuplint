import path from 'path';

import { readPackageJson } from './read-package-json';

export async function searchCoreRepository() {
	const pathes = path.resolve(process.cwd()).split(path.sep);

	// eslint-disable-next-line no-constant-condition
	while (true) {
		const currentDir = pathes.join(path.sep);
		const name = await readPackageJson(currentDir);

		if (name === 'markuplint-packages') {
			return currentDir;
		}

		const dir = pathes.pop();
		if (!dir) {
			return null;
		}
	}
}
