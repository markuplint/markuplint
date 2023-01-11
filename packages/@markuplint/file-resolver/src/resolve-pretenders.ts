import type { OptimizedConfig, Pretender, PretenderFileData } from '@markuplint/ml-config';

type PretendersConfig = OptimizedConfig['pretenders'];

export async function resolvePretenders(config: PretendersConfig): Promise<Pretender[]> {
	if (!config) {
		return [];
	}

	const data: Pretender[] = [];

	if (config.files) {
		for (const file of config.files) {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const pretenderFile: PretenderFileData = require(file);
			data.push(...pretenderFile.data);
		}
	}

	// Experimental
	if (config.imports) {
		for (const module of config.imports) {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const pretenderFile: PretenderFileData = require(`${module}/pretenders.json`);
			data.push(...pretenderFile.data);
		}
	}

	if (config.data) {
		data.push(...config.data);
	}

	// It wraps `Promise` currently due to needing to use `import()` someday.
	return await Promise.resolve(data);
}
