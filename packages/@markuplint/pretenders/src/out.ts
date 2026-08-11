import type { Pretender, PretenderFileData } from '@markuplint/ml-config';

import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { rebasePretenderFilePath } from '@markuplint/ml-config';

import { normalizePath } from './import-resolver/resolve-module-file.js';

const require = createRequire(import.meta.url);

/**
 * @param filePath - Where to write the pretenders JSON
 * @param data - Discovered pretender mappings, each carrying a `filePath`
 *   relative to `cwd` (the convention scanners use)
 * @param cwd - Base directory `data`'s `filePath` values are relative to.
 *   Defaults to `process.cwd()`, matching the scanners' own default.
 */
export async function out(filePath: string, data: readonly Pretender[], cwd: string = process.cwd()) {
	const outputDir = path.dirname(path.resolve(filePath));
	// `Pretender.filePath` is written by scanners relative to the scan-time `cwd`,
	// which is almost never where the output JSON itself ends up living. Rebasing
	// it here — relative to the JSON file's own location — is what lets a
	// consumer resolve it later without needing to know the original scan cwd.
	const rebasedData = data.map(pretender =>
		rebasePretenderFilePath(pretender, relPath =>
			normalizePath(path.relative(outputDir, path.resolve(cwd, relPath))),
		),
	);

	await writeFile(
		filePath,
		JSON.stringify(
			{
				version: require('../package.json').version,
				data: rebasedData,
			} satisfies PretenderFileData,
			null,
			2,
		),
		{ encoding: 'utf8' },
	);
}
