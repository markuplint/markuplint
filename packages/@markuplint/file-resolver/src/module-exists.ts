import { createRequire } from 'node:module';

import { log } from './debug.js';
import { importModule } from './import-module.js';
import { isRelativePath } from './path-utils.js';

const require = createRequire(import.meta.url);

const mLog = log.extend('module-exists');

/**
 * Whether `name` resolves to a module from where markuplint is installed: a package, or a file of
 * one, as `extends`, `parser` and `specs` take a module.
 *
 * The resolution is that of this file's own location, as `import()` and `createRequire()` do it,
 * never that of the configuration file that names the module, so a relative path is not a module
 * here and is answered `false` without asking the runtime: resolved from this file, it would reach
 * this package's own files or whatever lies above them. `resolveNameOrAbsPath` keeps a value
 * spelled as a path away in the first place; `ConfigProvider` passes the names it is given as they
 * are, so a relative one is answered `false` here and rejected as not absolute by its `#load`.
 *
 * The `catch` is not guarded by `isFatalError()`: what `import()` throws comes from the runtime's
 * loader, which reports a file it cannot take as a module with a `SyntaxError` or a `TypeError`.
 * Vite's module runner, which Vitest runs the specs in, reports such a file as a `Parse failure`,
 * and that alone proves the file resolves; after any other failure the specifier is asked of
 * `require.resolve()`, and what that throws, besides the module being absent or unexposed, is
 * re-thrown as it is.
 *
 * @param name - A bare specifier, or an absolute path
 * @returns `true` when the module resolves, including a file that the package's `exports` do not
 *   expose, and a file that resolves but cannot be imported; `false` for a relative path
 */
export async function moduleExists(name: string) {
	if (isRelativePath(name)) {
		return false;
	}

	try {
		await importModule(name);
	} catch (error) {
		if (error instanceof Error && /^parse failure/i.test(error.message)) {
			// It exists, but it failed to parse.
			mLog('Return true, but it caught Error in `import()`: %O', error);
			return true;
		}

		try {
			require.resolve(name);
		} catch (error) {
			if (
				// @ts-ignore
				'code' in error &&
				// @ts-ignore
				error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED'
			) {
				// Even if there are issues with the fields,
				// assume that the module exists and return true.
				mLog('Return true, but it caught Error in `require.resolve()`: %O', error);
				return true;
			}

			if (
				// @ts-ignore
				'code' in error &&
				// @ts-ignore
				error.code === 'MODULE_NOT_FOUND'
			) {
				return false;
			}

			throw error;
		}
	}

	return true;
}
