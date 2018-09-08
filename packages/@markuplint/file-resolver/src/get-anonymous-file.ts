import { MLFile } from './';

export function getAnonymousFile(context: string) {
	const file = new MLFile(context, true);
	return file;
}
