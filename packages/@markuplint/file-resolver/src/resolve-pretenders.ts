import type { OptimizedConfig, Pretender, PretenderFileData } from '@markuplint/ml-config';

import path from 'node:path';

import { glob } from 'glob';

import { generalImport } from './general-import.js';

type PretendersConfig = OptimizedConfig['pretenders'];

/**
 * Resolves pretender definitions from files, imported modules, inline data,
 * and dynamic component scanning in the configuration.
 *
 * @param config - The pretenders configuration section from the optimized config
 * @returns An array of all resolved pretender definitions
 */
export async function resolvePretenders(config: PretendersConfig): Promise<Pretender[]> {
	if (!config) {
		return [];
	}

	const data: Pretender[] = [];

	if (config.files) {
		for (const file of config.files) {
			const pretenderFile = await generalImport<PretenderFileData>(file);
			if (!pretenderFile?.data) {
				continue;
			}
			data.push(...pretenderFile.data);
		}
	}

	if (config.imports) {
		for (const module of config.imports) {
			const pretenderFile =
				// eslint-disable-next-line unicorn/no-await-expression-member
				(await generalImport<{ pretenders?: PretenderFileData }>(`${module}/package.json`))?.pretenders ??
				(await generalImport<PretenderFileData>(`${module}/pretenders.json`));
			if (!pretenderFile?.data) {
				continue;
			}
			data.push(...pretenderFile.data);
		}
	}

	if (config.data) {
		data.push(...config.data);
	}

	if (config.scan) {
		const { scan } = await import('@markuplint/pretenders');
		for (const entry of config.scan) {
			const patterns = typeof entry.files === 'string' ? [entry.files] : [...entry.files];
			const globResults = await Promise.all(patterns.map(p => glob(p)));
			const resolved = globResults.flat().map(f => path.resolve(f));
			if (resolved.length > 0) {
				const scanned = await scan(resolved, {
					ignoreComponentNames: entry.ignoreComponentNames ? [...entry.ignoreComponentNames] : undefined,
				});
				data.push(...scanned);
			}
		}
	}

	return data;
}
