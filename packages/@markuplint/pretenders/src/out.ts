import type { Pretender, PretenderFileData } from '@markuplint/ml-config';

import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Writes an array of pretender mappings to a JSON file in the PretenderFileData format.
 * The output file includes the package version and the pretender data array.
 *
 * @param filePath - The absolute path of the output JSON file to write
 * @param data - The array of Pretender objects to serialize
 */
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
