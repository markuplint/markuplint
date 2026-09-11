import path from 'node:path';

import { glob } from 'glob';

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
