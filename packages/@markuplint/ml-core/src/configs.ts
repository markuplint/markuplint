import type { Config } from '@markuplint/ml-config';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { log } from './debug.js';

export async function getPreset(name: string): Promise<Config> {
	const json = await forceImportJsonInModule(`@markuplint/config-presets/preset.${name}.json`);

	if (json instanceof Error) {
		throw new ReferenceError(`Preset markuplint:${name} is not found`);
	}

	return json as Config;
}

async function forceImportJsonInModule(modPath: string) {
	const error = await import(modPath).catch(error => error);

	if (error instanceof Error) {
		log('Error in forceImportJsonInModule: %O', error);

		if (!('code' in error)) {
			throw error;
		}

		if (error.code !== 'ERR_IMPORT_ASSERTION_TYPE_MISSING') {
			throw error;
		}

		const searchPath = /module\s"([^"]+)"\sneeds/i.exec(error.message);
		const absPath = searchPath?.[1] ?? null;

		log('Extract path: %s', absPath);

		if (!absPath) {
			throw error;
		}

		const normalizePath = absPath
			.replace(/^file:\/\//, '')
			.replaceAll('/', path.sep)
			// Windows
			.replace(/^[/\\][a-z]:/i, '');
		log('Find JSON file path: %s', normalizePath);

		const fileContent = await readFile(normalizePath, { encoding: 'utf8' });

		return JSON.parse(fileContent);
	}

	return error.default ?? error;
}
