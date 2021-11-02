import { Target, resolveFiles } from '@markuplint/file-resolver';
import { APIOptions } from './types';
import MLEngine from './ml-engine';
import { MLResultInfo } from '../types';

export async function lint(targetList: Target[], options?: APIOptions) {
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
