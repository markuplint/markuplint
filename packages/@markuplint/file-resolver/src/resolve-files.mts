import type { MLFile } from './ml-file/index.mjs';
import type { Target } from './types.mjs';

import { getAnonymousFile, getFiles } from './ml-file/index.mjs';

export async function resolveFiles(targetList: Target[]) {
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
