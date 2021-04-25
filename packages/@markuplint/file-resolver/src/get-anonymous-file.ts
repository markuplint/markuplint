import { MLFile } from './';

export function getAnonymousFile(context: string, workspace?: string, name?: string) {
	const file = new MLFile(context, true, workspace, name);
	return file;
}
