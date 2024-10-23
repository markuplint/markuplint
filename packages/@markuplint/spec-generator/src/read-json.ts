import fs from 'node:fs';
import path from 'node:path';

import { glob } from 'glob';
import strip from 'strip-json-comments';

export function readJson<T = Record<string, any>>(filePath: string): T {
	if (!path.isAbsolute(filePath)) {
		throw new Error(`The path must be absolute path: ${filePath}`);
	}
	let json = fs.readFileSync(filePath, { encoding: 'utf8' });
	json = strip(json);
	return JSON.parse(json) as T;
}

export async function readJsons<T = Record<string, any>>(
	pattern: string,
	hook: (fileName: string, body: T) => T | Promise<T> = (_, body) => body,
): Promise<T[]> {
	if (!path.isAbsolute(pattern)) {
		throw new Error(`The pattern must be absolute path: ${pattern}`);
	}
	const files = await glob(pattern, { windowsPathsNoEscape: true }); // support windows path but impossible to match a literal `*` `?` and so on in filenames.
	return Promise.all(
		files.map(file => {
			const json = readJson<T>(file);
			return hook(file, json);
		}),
	);
}
