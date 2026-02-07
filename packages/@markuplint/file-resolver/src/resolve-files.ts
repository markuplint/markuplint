import type { MLFile } from './ml-file/index.js';
import type { Target } from './types.js';

import { getAnonymousFile, getFiles } from './ml-file/index.js';

/**
 * Resolves a list of targets (file globs or inline source code objects) into
 * an array of {@link MLFile} instances.
 *
 * @param targetList - An array of file path globs or inline source code targets
 * @param ignoreGlob - An optional glob pattern for files to exclude
 * @returns An array of resolved MLFile instances
 */
export async function resolveFiles(targetList: readonly Readonly<Target>[], ignoreGlob?: string) {
	const res: MLFile[] = [];
	for (const target of targetList) {
		if (typeof target === 'string') {
			const file = await getFiles(target, ignoreGlob);
			res.push(...file);
			continue;
		}
		res.push(getAnonymousFile(target.sourceCode, target.workspace, target.name));
	}
	return res;
}
