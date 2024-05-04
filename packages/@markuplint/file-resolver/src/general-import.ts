import { createRequire } from 'node:module';

import { log } from './debug.js';

const gLog = log.extend('general-import');

const cache = new Map<string, unknown>();

const require = createRequire(import.meta.url);

export async function generalImport<T>(name: string): Promise<T | null> {
	if (cache.has(name)) {
		return cache.get(name) as T | null;
	}

	try {
		const imported = await import(name);
		const mod = imported?.default ?? imported ?? null;
		cache.set(name, mod);
		return mod;
	} catch (error) {
		if (
			// @ts-ignore
			'code' in error &&
			// @ts-ignore
			error.code === 'ERR_IMPORT_ASSERTION_TYPE_MISSING'
		) {
			try {
				const mod = require(name) ?? null;
				cache.set(name, mod);
				return mod;
			} catch (error) {
				if (error instanceof Error && /^parse failure/i.test(error.message)) {
					gLog('Error in `createRequire(import.meta.url)()`: %O', error);
					cache.set(name, null);
					return null;
				}

				gLog('Error in generalImport: %O', error);
			}
		}
		gLog('Error in `import()`: %O', error);

		cache.set(name, null);
		return null;
	}
}
