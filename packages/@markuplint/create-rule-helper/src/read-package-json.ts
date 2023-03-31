import fs from 'node:fs/promises';
import path from 'node:path';

export async function readPackageJson(dir: string) {
	const filePath = path.resolve(dir, 'package.json');

	try {
		const json = await fs.readFile(filePath, { encoding: 'utf-8' });
		const data = JSON.parse(json);

		return (data?.name as string) ?? null;
	} catch (_) {
		return null;
	}
}
