import type { MLFile } from './ml-file';

import { glob } from 'glob';

import { getFile } from './get-file';

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
