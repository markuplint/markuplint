import fs from 'node:fs';
import path from 'node:path';

import { glob } from 'glob';
import { parse } from 'jsonc-parser';

/**
 * @throws If the provided path is not absolute.
 */
export function readJson<T = Record<string, any>>(filePath: string): T {
	if (!path.isAbsolute(filePath)) {
		throw new Error(`The path must be absolute path: ${filePath}`);
	}
	const json = fs.readFileSync(filePath, { encoding: 'utf8' });
	return parse(json) as T;
}

/**
 * @throws If the provided pattern is not an absolute path.
 */
export async function readJsons<T = Record<string, any>>(
	pattern: string,
	hook: (fileName: string, body: T) => T | Promise<T> = (_, body) => body,
): Promise<T[]> {
	if (!path.isAbsolute(pattern)) {
		throw new Error(`The pattern must be absolute path: ${pattern}`);
	}
	const files = await glob(pattern, { windowsPathsNoEscape: true });
	return Promise.all(
		files.map(file => {
			const json = readJson<T>(file);
			return hook(file, json);
		}),
	);
}
