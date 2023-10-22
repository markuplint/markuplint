import type { MLFile } from './ml-file.js';

import { glob } from 'glob';
import { minimatch } from 'minimatch';

import { getFile } from './get-file.js';

/**
 * Get files
 *
 * Supported glob patterns
 *
 * @param filePathOrGlob
 */
export async function getFiles(filePathOrGlob: string, ignoreGlob?: string): Promise<MLFile[]> {
	const fileList = await glob(filePathOrGlob, {}).catch<string[]>(() => []);
	const filtered = fileList.filter(fileName => !minimatch(fileName, ignoreGlob ?? ''));
	return filtered.map(fileName => getFile(fileName));
}
