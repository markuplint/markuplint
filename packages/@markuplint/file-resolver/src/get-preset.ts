import type { Config } from '@markuplint/ml-config';

import { log } from './debug.js';

const cache = new Map<string, Config>();
const pLog = log.extend('get-preset');

export async function getPreset(name: string): Promise<Config> {
	if (cache.has(name)) {
		return cache.get(name)!;
	}

	const imported = await import(`@markuplint/config-presets/preset.${name}.json`, {
		with: { type: 'json' },
	}).catch(error => error);

	if (imported instanceof Error) {
		pLog('Error in getPreset: %O', imported);
		throw new ReferenceError(`Preset markuplint:${name} is not found`);
	}

	const json: Config = imported.default ?? imported;
	cache.set(name, json);

	return json;
}
