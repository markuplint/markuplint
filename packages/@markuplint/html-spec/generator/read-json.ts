import fs from 'node:fs';
import path from 'node:path';

import { glob } from 'glob';
import { parse } from 'jsonc-parser';

/**
 * Reads and parses a single JSON file (with support for JSON comments) from an absolute file path.
 *
 * @template T - The expected shape of the parsed JSON data
 * @param filePath - The absolute file path to the JSON file
 * @returns The parsed JSON content
 * @throws If the provided path is not absolute
 */
export function readJson<T = Record<string, any>>(filePath: string): T {
	if (!path.isAbsolute(filePath)) {
		throw new Error(`The path must be absolute path: ${filePath}`);
	}
	const json = fs.readFileSync(filePath, { encoding: 'utf8' });
	return parse(json) as T;
}

/**
 * Reads multiple JSON files matching a glob pattern and optionally transforms each result.
 * All matched files are read and parsed in parallel.
 *
 * @template T - The expected shape of each parsed JSON file
 * @param pattern - An absolute glob pattern to match JSON files
 * @param hook - An optional transformation function called with each file path and its parsed body
 * @returns An array of parsed (and optionally transformed) JSON objects
 * @throws If the provided pattern is not an absolute path
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
