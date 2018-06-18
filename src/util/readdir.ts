import fs from 'fs';

// @ts-ignore
import promisify from 'util.promisify';

const readdir = promisify(fs.readdir);

export default async function(filePath: fs.PathLike): Promise<string[]> {
	return await readdir(filePath);
}
