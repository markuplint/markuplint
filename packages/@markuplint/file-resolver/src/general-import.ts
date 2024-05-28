import { createRequire } from 'node:module';

import { log } from './debug.js';

const gLog = log.extend('general-import');
const gLogSuccess = gLog.extend('success');
const gLogError = gLog.extend('error');

const cache = new Map<string, unknown>();

const require = createRequire(import.meta.url);

export async function generalImport<T>(name: string): Promise<T | null> {
	if (cache.has(name)) {
		return cache.get(name) as T | null;
	}

	try {
		const imported = await import(name);
		const mod = imported?.default ?? imported ?? null;
		gLogSuccess('Success by import("%s"): %O', name, mod);
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
				gLogSuccess('Success by require("%s"): %O', name, mod);
				cache.set(name, mod);
				return mod;
			} catch (error) {
				if (error instanceof Error && /^parse failure/i.test(error.message)) {
					gLogError('Error in `createRequire(import.meta.url)()`: %O', error);
					cache.set(name, null);
					return null;
				}

				gLogError('Error in generalImport: %O', error);
			}
		}
		gLogError('Error in `import()`: %O', error);

		cache.set(name, null);
		return null;
	}
}
