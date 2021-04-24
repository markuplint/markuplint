import { MLFile } from './';

export function getAnonymousFile(context: string, workspace?: string, name?: string) {
	return new MLFile(context, true, workspace, name);
}
