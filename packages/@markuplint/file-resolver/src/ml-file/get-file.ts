import { MLFile } from './ml-file.js';

export function getFile(filePath: string) {
	const file = new MLFile(filePath);
	return file;
}
