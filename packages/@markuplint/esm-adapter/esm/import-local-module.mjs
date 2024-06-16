import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 *
 * @param {string} id
 * @param {string} baseDir
 * @returns
 */
export async function importLocalModule(id, baseDir) {
	baseDir = baseDir ?? process.cwd();
	const dirArray = baseDir.split(path.sep);
	while (dirArray.length > 0) {
		try {
			const modDir = [...dirArray, 'node_modules', id].join(path.sep);
			const { module, modPath } = await importFromDirectory(modDir);
			return { module, modPath };
		} catch {
			dirArray.pop();
		}
	}
	return null;
}

/**
 *
 * @param {string} dirName
 */
async function importFromDirectory(dirName) {
	const packageJson = await readFile(path.resolve(dirName, 'package.json'), { encoding: 'utf8' });
	const { exports } = JSON.parse(packageJson);
	const main = exports['.'];
	const mainFile = typeof main === 'string' ? main : main.import;
	const mainPath = path.resolve(dirName, ...mainFile.split('/'));
	const module = await import(mainPath);
	return {
		module,
		modPath: mainPath,
	};
}
