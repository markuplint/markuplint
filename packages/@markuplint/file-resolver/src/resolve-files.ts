import type { MLFile } from './ml-file';
import type { Target } from './types';

import { getAnonymousFile } from './get-anonymous-file';
import { getFiles } from './get-files';

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
