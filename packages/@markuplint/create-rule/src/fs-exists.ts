import { stat } from 'node:fs/promises';

/**
 * Checks whether a file or directory exists at the given path.
 *
 * Uses `fs.stat` internally and treats `ENOENT` errors as a non-existent path.
 * Any other filesystem errors are re-thrown.
 *
 * @param path - The absolute or relative filesystem path to check.
 * @returns `true` if the path exists, `false` otherwise.
 */
export async function fsExists(path: string) {
	const res = await stat(path).catch(error => {
		if (error?.code === 'ENOENT') {
			return null;
		}
		throw error;
	});

	return !!res;
}
