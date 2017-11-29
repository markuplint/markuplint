import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

const exists = util.promisify(fs.exists);

export default async function fileSearch (fileList: string[], dir: string) {
	const notfoundFiles: string[] = [];
	const dirList = dir.split(path.sep);
	while (dirList.length) {
		const absFileList = fileList.map((filePath) => path.join(path.sep, ...dirList, filePath));
		for (const filePath of absFileList) {
			if (await exists(filePath)) {
				return filePath;
			} else {
				notfoundFiles.push(filePath);
			}
		}
		dirList.pop();
	}
	throw new ReferenceError(`A Ruleset file is not found.\n${notfoundFiles.join('\n')}`);
}
