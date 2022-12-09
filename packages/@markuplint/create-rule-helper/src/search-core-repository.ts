import path from 'node:path';

import { readPackageJson } from './read-package-json';

export async function searchCoreRepository() {
	const paths = path.resolve(process.cwd()).split(path.sep);

	// eslint-disable-next-line no-constant-condition
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
