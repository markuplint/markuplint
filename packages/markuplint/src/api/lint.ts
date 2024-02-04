import type { APIOptions } from './types.js';
import type { MLResultInfo } from '../types.js';
import type { Target } from '@markuplint/file-resolver';

import { resolveFiles } from '@markuplint/file-resolver';

import { MLEngine } from './ml-engine.js';

export async function lint(targetList: readonly Readonly<Target>[], options?: APIOptions) {
	const res: MLResultInfo[] = [];
	const files = await resolveFiles(targetList);

	for (const file of files) {
		const engine = new MLEngine(file, options);
		const result = await engine.exec();

		if (!result) {
			continue;
		}

		res.push(result);
	}

	return res;
}
