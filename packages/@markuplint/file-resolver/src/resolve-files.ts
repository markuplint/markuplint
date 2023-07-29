import type { MLFile } from './ml-file/index.js';
import type { Target } from './types.js';

import { getAnonymousFile, getFiles } from './ml-file/index.js';

export async function resolveFiles(targetList: readonly Readonly<Target>[]) {
	const res: MLFile[] = [];
	for (const target of targetList) {
		if (typeof target === 'string') {
			const file = await getFiles(target);
			res.push(...file);
			continue;
		}
		res.push(getAnonymousFile(target.sourceCode, target.workspace, target.name));
	}
	return res;
}
