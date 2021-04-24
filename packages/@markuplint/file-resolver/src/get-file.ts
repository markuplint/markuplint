import { MLFile } from './';

export function getFile(filePath: string) {
	return new MLFile(filePath);
}
