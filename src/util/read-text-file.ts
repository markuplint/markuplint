import fs from 'fs';

// @ts-ignore
import promisify from 'util.promisify';

const readFile = promisify(fs.readFile);

export default async function (filePath: fs.PathLike): Promise<string> {
	return await readFile(filePath, 'utf-8');
}
