import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { log } from './debug.js';

const fLog = log.extend('force-import-json-in-module');

export async function forceImportJsonInModule(modPath: string) {
	const error = await import(modPath).catch(error => error);

	if (error instanceof Error) {
		fLog('Error in forceImportJsonInModule: %O', error);

		if (!('code' in error)) {
			return error;
		}

		if (error.code !== 'ERR_IMPORT_ASSERTION_TYPE_MISSING' && error.code !== 'ERR_IMPORT_ATTRIBUTE_MISSING') {
			return error;
		}

		const searchPath = /module\s"([^"]+)"\sneeds/i.exec(error.message);
		const absPath = searchPath?.[1] ?? null;

		fLog('Extract path: %s', absPath);

		if (!absPath) {
			return error;
		}

		const normalizePath = absPath
			.replace(/^file:\/\//, '')
			.replaceAll('/', path.sep)
			// Windows
			.replace(/^[/\\](?=[a-z]:)/i, ''); // only remove a leading slash
		fLog('Find JSON file path: %s', normalizePath);

		const fileContent = await readFile(normalizePath, { encoding: 'utf8' });

		return JSON.parse(fileContent);
	}

	return error.default ?? error;
}
