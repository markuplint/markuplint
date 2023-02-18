import path from 'node:path';
import { promisify } from 'node:util';

import { glob } from 'glob';

const globAsync = promisify(glob);

export async function getFileList(input: string[]) {
	return (
		await Promise.all(
			input
				.map(filePath => {
					if (path.isAbsolute(filePath)) {
						return filePath;
					}
					return path.resolve(process.cwd(), filePath);
				})
				.map(filePath => globAsync(filePath)),
		)
	).flat();
}
