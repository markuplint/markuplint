import { MLFile } from './ml-file';

export function getAnonymousFile(context: string, workspace?: string, name?: string) {
	const file = new MLFile(context, true, workspace, name);
	return file;
}
