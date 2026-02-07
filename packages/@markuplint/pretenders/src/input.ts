import path from 'node:path';

import { glob } from 'glob';

/**
 * Resolves a list of file path patterns (possibly relative or glob patterns)
 * into a flat array of matching absolute file paths.
 *
 * @param input - An array of file paths or glob patterns to resolve
 * @returns A flat array of resolved absolute file paths matching the input patterns
 */
export async function getFileList(input: readonly string[]) {
	const result = await Promise.all(
		input
			.map(filePath => {
				if (path.isAbsolute(filePath)) {
					return filePath;
				}
				return path.resolve(process.cwd(), filePath);
			})
			.map(filePath => glob(filePath)),
	);
	return result.flat();
}
