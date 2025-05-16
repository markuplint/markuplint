import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { resolve } from 'import-meta-resolve';

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
		// Convert absolute paths to file:// URL format
		let importPath = name;
		if (path.isAbsolute(name)) {
			// Use Node.js pathToFileURL function to convert to a proper URL
			importPath = pathToFileURL(name).href;
			gLog('Converted to file URL: %s', importPath);
		}

		const imported = await import(importPath);
		const mod = imported?.default ?? imported ?? null;
		gLogSuccess('Success by import("%s"): %O', importPath, mod);
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

		if (error instanceof Error) {
			const { filePath, packageName } =
				/Missing\s"(?<filePath>[^"]+)"\sspecifier\sin\s"(?<packageName>[^"]+)"\spackage/.exec(error.message)
					?.groups ?? {};
			if (filePath && packageName) {
				const modFile = resolve(packageName, import.meta.url);
				const modPath = path.dirname(modFile);
				const candidate = path.join(modPath, filePath);
				gLog('Try import absolute path: "%s"', candidate);
				const result = await generalImport<T>(candidate);
				cache.set(name, result);
				return result;
			}
		}

		if (path.isAbsolute(name) && name.endsWith('.json')) {
			const file = await fs.readFile(name, 'utf8');
			const json = JSON.parse(file);
			gLogSuccess('Success by readFile("%s") and JSON.parse: %O', name, json);
			cache.set(name, json);
			return json;
		}

		gLogError('Error in `import()`: %O', error);

		cache.set(name, null);
		return null;
	}
}
