import type { MLFile } from './ml-file.js';

import { glob } from 'glob';

import { getFile } from './get-file.js';

/**
 * Get files
 *
 * Supported glob patterns
 *
 * @param filePathOrGlob
 */
export async function getFiles(filePathOrGlob: string): Promise<MLFile[]> {
	const fileList = await glob(filePathOrGlob, {}).catch<string[]>(() => []);
	return fileList.map(fileName => getFile(fileName));
}
