import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { isFatalError } from '@markuplint/shared';
import { resolve } from 'import-meta-resolve';

import { log } from './debug.js';
import { fromFileURL, toFileURL } from './path-utils.js';

const gLog = log.extend('general-import');
const gLogSuccess = gLog.extend('success');
const gLogError = gLog.extend('error');

const cache = new Map<string, unknown>();

const require = createRequire(import.meta.url);

export async function generalImport<T>(name: string): Promise<T | null> {
	if (cache.has(name)) {
		return cache.get(name) as T | null;
	}

	// When the specifier is a package subpath (e.g., "@scope/pkg/file.json"),
	// the package's exports map may not include it. Instead of relying on
	// error codes (which differ between Node.js and vitest/vite), resolve
	// the package directory upfront and convert to an absolute path.
	const resolved = resolvePackageSubpath(name);
	if (resolved) {
		gLog('Resolved package subpath "%s" to "%s"', name, resolved);
		const result = await generalImport<T>(resolved);
		cache.set(name, result);
		return result;
	}

	try {
		// Convert absolute paths to file:// URL format. `toFileURL()` is
		// OS-independent (see #3840 — Node's `pathToFileURL()` resolves a
		// POSIX-style absolute path against the current Windows drive).
		const importPath = toFileURL(name);
		if (importPath !== name) {
			gLog('Converted to file URL: %s', importPath);
		}

		const imported = await import(importPath);
		const mod = imported?.default ?? imported ?? null;
		gLogSuccess('Success by import("%s"): %O', importPath, mod);
		cache.set(name, mod);
		return mod;
	} catch (error) {
		// NOTE: `isFatalError()` is intentionally NOT applied at this catch
		// boundary. `await import()` / `require()` invoke third-party module
		// code, so any Tier-1-shaped error (TypeError / SyntaxError / etc.)
		// at this point may originate from inside the imported module and
		// not from markuplint's own code — we cannot distinguish the two.
		// The Tier 1 classification (see `isFatalError()` in
		// `@markuplint/shared`) only covers errors raised by markuplint's
		// own code, which excludes third-party import failures (e.g. Node 22+ removing
		// import assertion syntax, or bun's stricter ESM parser). Treating
		// every error as a recoverable null-return is the correct policy
		// here; callers (config / parser / plugin loaders) decide how to
		// surface the missing module.
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
				const modNativePath = modFile.startsWith('file:') ? fromFileURL(modFile) : modFile;
				const modPath = path.dirname(modNativePath);
				const candidate = path.join(modPath, filePath);
				gLog('Try import absolute path: "%s"', candidate);
				const result = await generalImport<T>(candidate);
				cache.set(name, result);
				return result;
			}
		}

		if (path.isAbsolute(name) && name.endsWith('.json')) {
			try {
				const file = await fs.readFile(name, 'utf8');
				const json = JSON.parse(file);
				gLogSuccess('Success by readFile("%s") and JSON.parse: %O', name, json);
				cache.set(name, json);
				return json;
			} catch (readError) {
				gLogError('Error in readFile("%s"): %O', name, readError);
			}
		}

		gLogError('Error in `import()`: %O', error);

		cache.set(name, null);
		return null;
	}
}

/**
 * Returns `null` (rather than throwing) in three distinct cases that callers
 * treat identically — no bypass is needed:
 * - The specifier is not a package subpath (absolute path, relative path, no subpath)
 * - The package's exports map already includes the subpath
 * - The package cannot be found at all
 */
function resolvePackageSubpath(name: string): string | null {
	if (path.isAbsolute(name) || name.startsWith('.')) {
		return null;
	}

	const packageName = name.startsWith('@') ? name.split('/').slice(0, 2).join('/') : name.split('/')[0];
	if (!packageName) {
		return null;
	}
	const subpath = name.slice(packageName.length + 1);
	if (!subpath) {
		return null;
	}

	const pkgDir = resolvePackageDir(packageName);
	if (!pkgDir) {
		return null;
	}

	try {
		const pkgJson = require(path.join(pkgDir, 'package.json')) as { exports?: unknown };
		if (!pkgJson.exports) {
			return null; // No exports map — import() should work fine
		}
		// If the exports map explicitly includes this subpath, let import() handle it
		const exportKey = `./${subpath}`;
		if (typeof pkgJson.exports === 'object' && !Array.isArray(pkgJson.exports) && exportKey in pkgJson.exports) {
			return null;
		}
		// Subpath not in exports — resolve to absolute path to bypass the restriction
		return path.join(pkgDir, subpath);
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		return null;
	}
}

function resolvePackageDir(packageName: string): string | null {
	// Try CJS require.resolve first — it can often resolve package.json
	// even when the ESM exports map doesn't include it
	try {
		return path.dirname(require.resolve(`${packageName}/package.json`));
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		// Fall through
	}

	// Fall back to import-meta-resolve to find the main entry, then walk up
	try {
		const mainUrl = resolve(packageName, import.meta.url);
		const mainPath = mainUrl.startsWith('file:') ? fromFileURL(mainUrl) : mainUrl;
		let dir = path.dirname(mainPath);
		for (let i = 0; i < 10; i++) {
			try {
				require(path.join(dir, 'package.json'));
				return dir;
			} catch (innerError) {
				if (isFatalError(innerError)) {
					throw innerError;
				}
				const parent = path.dirname(dir);
				if (parent === dir) {
					break; // Reached filesystem root
				}
				dir = parent;
			}
		}
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		// Package not found at all
	}

	return null;
}
