import type { MLFile } from './ml-file';
import type { Target } from './types';

import { getAnonymousFile, getFiles } from './ml-file';

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
