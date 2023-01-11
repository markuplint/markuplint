import type { Pretender, PretenderFileData } from '@markuplint/ml-config';

import { writeFile } from 'node:fs/promises';

export async function out(filePath: string, data: Pretender[]) {
	await writeFile(
		filePath,
		JSON.stringify(
			{
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				version: require('../package.json').version,
				data,
			} as PretenderFileData,
			null,
			2,
		),
		{ encoding: 'utf-8' },
	);
}
