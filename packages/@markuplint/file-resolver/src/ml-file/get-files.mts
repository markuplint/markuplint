import type { MLFile } from './ml-file.mjs';

import glob from 'glob';

import { getFile } from './get-file.mjs';

/**
 * Get files
 *
 * Supported glob patterns
 *
 * @param filePathOrGlob
 */
export async function getFiles(filePathOrGlob: string): Promise<MLFile[]> {
	const fileList = await new Promise<string[]>((resolve, reject) => {
		glob(filePathOrGlob, {}, (err, matches) => {
			if (err) {
				reject(err);
			}
			resolve(matches);
		});
	}).catch<string[]>(() => []);

	return fileList.map(fileName => getFile(fileName));
}
