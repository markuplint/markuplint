import { MLFile } from './ml-file.mjs';

export function getFile(filePath: string) {
	const file = new MLFile(filePath);
	return file;
}
