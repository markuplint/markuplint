import type { OptimizedConfig, Pretender, PretenderFileData } from '@markuplint/ml-config';

import { generalImport } from './general-import.js';

type PretendersConfig = OptimizedConfig['pretenders'];

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

	return data;
}
