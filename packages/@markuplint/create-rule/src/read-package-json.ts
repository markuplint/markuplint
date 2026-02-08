import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Reads the `package.json` file in the given directory and extracts the package name.
 *
 * @param dir - The directory containing the `package.json` file.
 * @returns The `name` field from the package.json, or `null` if the file
 *          does not exist, cannot be parsed, or has no `name` field.
 */
export async function readPackageJson(dir: string) {
	const filePath = path.resolve(dir, 'package.json');

	try {
		const json = await fs.readFile(filePath, { encoding: 'utf8' });
		const data = JSON.parse(json);

		return (data?.name as string) ?? null;
	} catch {
		return null;
	}
}
