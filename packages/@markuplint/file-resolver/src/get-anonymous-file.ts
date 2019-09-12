import { MLFile } from './';

export function getAnonymousFile(context: string, workspace?: string) {
	const file = new MLFile(context, true, workspace);
	return file;
}
