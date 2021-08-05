import { MLFile } from './ml-file';

export function getFile(filePath: string) {
	const file = new MLFile(filePath);
	return file;
}
