import fs from 'fs';
import path from 'path';

const exists = (p: string) => {
	return new Promise<boolean>((r, e) => {
		fs.exists(p, r);
	});
};

export default async function fileSearch(fileList: string[], dir: string) {
	const notfoundFiles: string[] = [];
	const dirList = dir.split(path.sep);
	while (dirList.length) {
		const absFileList = fileList.map(filePath =>
			path.join(path.sep, ...dirList, filePath),
		);
		for (const filePath of absFileList) {
			if (await exists(filePath)) {
				return filePath;
			} else {
				notfoundFiles.push(filePath);
			}
		}
		dirList.pop();
	}
	throw new ReferenceError(
		`A Ruleset file is not found.\n${notfoundFiles.join('\n')}`,
	);
}
