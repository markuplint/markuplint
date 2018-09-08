import { MLFile } from './';

export function getFile(filePath: string) {
	const file = new MLFile(filePath);
	return file;
}
