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
	hook: (fileName: string, body: T, source: string) => T | Promise<T> = (_, body) => body,
): Promise<T[]> {
	if (!path.isAbsolute(pattern)) {
		throw new Error(`The pattern must be absolute path: ${pattern}`);
	}
	const files = await glob(pattern, { windowsPathsNoEscape: true });
	return Promise.all(
		files.map(file => {
			const source = fs.readFileSync(file, { encoding: 'utf8' });
			return hook(file, parse(source) as T, source);
		}),
	);
}

/**
 * The URL on the first line of the source file of an element: the section that defines the element. It is the `cite`
 * of the element in `index.json`, so what the data says about where an element is defined is what the weekly spec
 * citation watch reads (`scripts/spec-citations/definition.ts`), not the MDN page that the generator also fetches.
 *
 * @param source - The text of the source file (`src/spec.*.jsonc`)
 * @param file - The path of the source file, for the message
 * @throws {Error} When the first line is not a `//` comment that holds nothing but a URL
 */
export function getDefinitionCite(source: string, file: string): string {
	// A byte order mark is not part of the first line
	const [firstLine = ''] = source.replace(/^\uFEFF/, '').split(/\r?\n/);
	const url = /^\/\/\s*(https?:\/\/\S+)\s*$/.exec(firstLine)?.[1];
	if (!url) {
		throw new Error(
			`The first line of ${file} must be a \`//\` comment that holds only the URL of the section that defines the element (\`// https://…\`).`,
		);
	}
	return url;
}
