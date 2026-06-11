import type { Pretender, PretenderFileData } from '@markuplint/ml-config';

import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export async function out(filePath: string, data: readonly Pretender[]) {
	await writeFile(
		filePath,
		JSON.stringify(
			{
				version: require('../package.json').version,
				data,
			} satisfies PretenderFileData,
			null,
			2,
		),
		{ encoding: 'utf8' },
	);
}
