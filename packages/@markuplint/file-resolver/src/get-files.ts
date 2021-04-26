import { MLFile, getFile } from './';
import glob from 'glob';

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

/**
 * Get files
 *
 * Supported glob patterns
 *
 * @param filePathOrGlob
 */
export function getFilesSync(filePathOrGlob: string): MLFile[] {
	let fileList: string[] = [];
	try {
		fileList = glob.sync(filePathOrGlob, {});
	} catch {
		// ignore
	}
	return fileList.map(fileName => getFile(fileName));
}
