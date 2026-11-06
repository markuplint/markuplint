import { createRequire } from 'node:module';
import path from 'node:path';

import { isFatalError } from '@markuplint/shared';
import { resolve } from 'import-meta-resolve';

import { log } from './debug.js';
import { importModule } from './import-module.js';
import { fromFileURL, isRelativePath, toFileURL } from './path-utils.js';

const gLog = log.extend('general-import');
const gLogSuccess = gLog.extend('success');
const gLogError = gLog.extend('error');

const cache = new Map<string, unknown>();

const require = createRequire(import.meta.url);

/**
 * Imports the module that a configuration names (a configuration to `extends`, a parser, a
 * plugin, the data of `pretenders`) and returns what it exports: the default export when there is
 * one, the namespace otherwise. Whatever cannot be imported, for whatever reason, yields `null`,
 * as the callers report a missing module in their own terms; the reason goes to the debug log.
 *
 * A subpath of a package that its `exports` map does not expose is turned into the absolute path
 * of the file first (see {@link resolvePackageSubpath}), as `import()` refuses it. A JSON module
 * is taken by {@link importModule} through `require()`, so no `.json` file is read by hand: what
 * `require()` takes as JSON, a byte order mark included, is what is accepted.
 *
 * The result is cached by specifier for the life of the process, `null` included; `import()`
 * itself keeps a module for as long, so a fresh read is not to be had either way.
 *
 * @template T - What the module exports
 * @param name - A bare specifier, with a subpath or not, or an absolute path
 * @returns What the module exports, or `null` when it cannot be imported
 */
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

		const imported = await importModule(importPath);
		// A JSON module whose value is `null` is `null`, as a file with nothing in it; `??` would
		// hand the namespace over instead.
		const mod = (('default' in imported ? imported.default : imported) ?? null) as T | null;
		gLogSuccess('Success by import("%s"): %O', importPath, mod);
		cache.set(name, mod);
		return mod;
	} catch (error) {
		// `isFatalError()` is intentionally NOT applied at this catch: `importModule()` runs
		// `import()`, which evaluates third-party module code, so a Tier-1-shaped error here
		// (TypeError / SyntaxError / etc.) may come from the imported module or from the runtime's
		// loader rather than from markuplint's own code, and the two cannot be told apart. Every
		// error is a recoverable `null`; the callers (config / parser / plugin loaders) decide how
		// to surface the missing module.
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
	if (path.isAbsolute(name) || isRelativePath(name)) {
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
