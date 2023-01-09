import { MLFile } from './ml-file.mjs';

export function getAnonymousFile(context: string, workspace?: string, name?: string) {
	const file = new MLFile({
		sourceCode: context,
		workspace,
		name,
	});
	return file;
}
