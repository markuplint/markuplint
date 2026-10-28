import type { LoaderSync, Loader } from 'cosmiconfig';
import type { FileHandle } from 'node:fs/promises';

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspect } from 'node:util';

import { cosmiconfig, defaultLoaders, defaultLoadersSync } from 'cosmiconfig';
import { jsonc } from 'jsonc';

import { ConfigLoadError, isFatalError } from '@markuplint/shared';
import { log } from './debug.js';

const searchLog = log.extend('search');

/**
 * Fatal errors (see {@link isFatalError}) raised by markuplint's own code inside a loader. cosmiconfig
 * gives every error a loader throws the path of the file, so {@link cacheConfigError} looks here to
 * re-throw these as they are instead of reporting them as the configuration's fault.
 */
const ownErrors = new WeakSet<object>();

/**
 * The `$import` target that {@link withImportCheck} could not read, by the error it threw.
 */
const unreadableImports = new WeakMap<object, string>();

/**
 * The files whose change can fix a `ConfigLoadError` raised here, by the error; see
 * {@link configLoadErrorFiles}.
 */
const filesOfErrors = new WeakMap<ConfigLoadError, readonly string[]>();

const jsoncLoader: Loader = (path, content) => {
	try {
		return jsonc.parse(content);
	} catch (error: unknown) {
		if (error instanceof Error && error.name === 'JSONError') {
			return defaultLoaders['noExt'](path, content);
		}
		if (isFatalError(error) && error instanceof Error) {
			ownErrors.add(error);
		}
		throw error;
	}
};

/**
 * Loads a JavaScript or TypeScript configuration file as cosmiconfig's `loadJs` does: `import()`
 * of its real path, then `require()` when that fails, and the error of `import()` when `require()`
 * fails only because the file is an ES module. Spelled out because `loadJs` reads `code` of what
 * `require()` throws, which itself throws a `TypeError` when the configuration code throws `null`
 * or `undefined`, and the value is lost.
 *
 * A value the configuration code throws that is not an `Error` is thrown as one, with the value as
 * its `cause`, so that it reaches {@link cacheConfigError} with the path of the file. cosmiconfig
 * assigns `filepath` to what a loader throws, and that assignment itself throws a `TypeError` on a
 * primitive, which loses both the value and the path.
 *
 * When cosmiconfig is upgraded, compare this with its `loadJs` (`dist/loaders.js`): how it
 * imports the file, when it falls back to `require()` (`ERR_REQUIRE_ESM`), and whether it has
 * started transpiling TypeScript itself.
 *
 * Neither `catch` is guarded by {@link isFatalError}: what is caught there was thrown by the
 * user's code, or by the runtime loading it.
 *
 * @param filepath - The configuration file
 * @param content - Its content, which `require()` does not use
 * @returns The default export of the module, or `module.exports` of a CommonJS module
 */
const jsLoader: Loader = async (filepath, content) => {
	try {
		try {
			const { href } = pathToFileURL(await fs.realpath(filepath));
			const module: unknown = await import(href);
			return module && typeof module === 'object' && 'default' in module ? module.default : undefined;
		} catch (importError: unknown) {
			try {
				return defaultLoadersSync['.js']!(filepath, content);
			} catch (requireError: unknown) {
				throw isRequireOfEsModule(requireError) ? importError : requireError;
			}
		}
	} catch (error: unknown) {
		if (error instanceof Error) {
			throw error;
		}
		const message = typeof error === 'string' ? error : inspect(error, { breakLength: Infinity });
		throw new Error(message, { cause: error });
	}
};

/**
 * Whether `require()` failed only because the file is an ES module, the same test as
 * cosmiconfig's `loadJs`.
 *
 * @param requireError - What `require()` threw
 * @returns `true` when the error of `import()` is the one to report
 */
function isRequireOfEsModule(requireError: unknown) {
	return (
		(requireError instanceof Error && 'code' in requireError && requireError.code === 'ERR_REQUIRE_ESM') ||
		(requireError instanceof SyntaxError &&
			requireError.toString().includes('Cannot use import statement outside a module'))
	);
}

/**
 * Wraps `loader` so that a `$import` target that cannot be read fails while the file that
 * declares it is being loaded. cosmiconfig reads the targets itself after the loader has
 * returned, and fails without `filepath` there; worse, its search takes a target that does not
 * exist (or ENOENT's kin: EACCES, EISDIR, ENOTDIR) for a search place without a file, and passes
 * the declaring file over in silence, so the target would be linted with another configuration.
 * Thrown from inside the loader, the failure carries the path of the declaring file (see
 * {@link cacheConfigError}).
 *
 * A target that is not a string, the file itself, or a cycle is left to cosmiconfig, which
 * reports it with the path in its message (see {@link importErrorPath}).
 *
 * Each target is opened and one byte of it read, which fails as cosmiconfig's `readFile` of it
 * would (a directory fails at the read, not at the open), without reading it in full twice. A
 * fatal error of this check is markuplint's own, and is recorded in {@link ownErrors}.
 *
 * @param loader - The loader of one format
 * @returns The loader, checking the `$import` of what it loaded
 */
function withImportCheck(loader: Loader): Loader {
	return async (filepath, content) => {
		const loaded: unknown = await loader(filepath, content);
		try {
			const imports = importsOf(filepath, loaded);
			await Promise.all(
				imports
					.filter(importPath => typeof importPath === 'string')
					.map(importPath => probeImport(path.resolve(path.dirname(filepath), importPath), importPath)),
			);
		} catch (error: unknown) {
			if (isFatalError(error) && error instanceof Error) {
				ownErrors.add(error);
			}
			throw error;
		}
		return loaded;
	};
}

/**
 * The `$import` entries of what a loader loaded, taken from where cosmiconfig takes them: the
 * `markuplint` field of a package file (`package.json`, `package.yaml` and the like, whatever the
 * extension), or the whole of any other file.
 *
 * @param filepath - The file the loader was given
 * @param loaded - What the loader returned
 * @returns The entries, of whatever type; empty when there is no `$import`
 */
function importsOf(filepath: string, loaded: unknown): readonly unknown[] {
	const own =
		path.basename(filepath, path.extname(filepath)) === 'package'
			? loaded && typeof loaded === 'object' && 'markuplint' in loaded
				? loaded.markuplint
				: undefined
			: loaded;
	if (!own || typeof own !== 'object' || !('$import' in own)) {
		return [];
	}
	return Array.isArray(own.$import) ? own.$import : [own.$import];
}

/**
 * Fails when `target` cannot be read; see {@link withImportCheck}.
 *
 * @param target - The absolute path of a `$import` target
 * @param importPath - The entry as written, for the message
 */
async function probeImport(target: string, importPath: string) {
	let handle: FileHandle | undefined;
	try {
		handle = await fs.open(target, 'r');
		await handle.read(Buffer.alloc(1), 0, 1, 0);
	} catch (error: unknown) {
		if (isFatalError(error)) {
			throw error;
		}
		const cannotImport = new Error(
			`Cannot import ${importPath}: ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error },
		);
		unreadableImports.set(cannotImport, target);
		throw cannotImport;
	} finally {
		await handle?.close();
	}
}

const explorer = cosmiconfig('markuplint', {
	searchPlaces: [
		'package.json',
		'.markuplintrc',
		'.markuplintrc.json',
		'.markuplintrc.jsonc',
		'.markuplintrc.yaml',
		'.markuplintrc.yml',
		'.markuplintrc.js',
		'.markuplintrc.ts',
		'.markuplintrc.cjs',
		'.markuplintrc.mjs',
		'markuplint.config.js',
		'markuplint.config.ts',
		'markuplint.config.cjs',
		'markuplint.config.mjs',
		'markuplint.config.jsonc',
	],
	loaders: {
		noExt: withImportCheck(jsoncLoader),
		'.jsonc': withImportCheck(jsoncLoader),
		'.json': withImportCheck(defaultLoaders['.json']),
		'.yaml': withImportCheck(defaultLoaders['.yaml']),
		'.yml': withImportCheck(defaultLoaders['.yml']),
		...Object.fromEntries(
			['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'].map(ext => [ext, withImportCheck(jsLoader)]),
		),
	},
	// Not 'project', which stops at the first `package.json`; `search()` walks the ancestors itself.
	searchStrategy: 'none',
});

type CosmiConfig = ReturnType<LoaderSync>;

/**
 * Clears the shared `cosmiconfig` explorer's own internal search/load caches.
 * Distinct from this module's `cacheClear` parameters (which clear the same
 * caches but only as a side effect of one `search`/`load` call) — this lets a
 * caller (see `ConfigProvider#invalidate`) clear them up front, before any
 * `search`/`load` call, so a subsequent `search` reads the current file
 * content instead of the explorer's stale cache. See #4015.
 */
export function clearExplorerCache() {
	explorer.clearCaches();
}

/**
 * Spelled out because `search()` needs the ancestors one directory at a time; see there for why
 * none of cosmiconfig's own search strategies fits.
 *
 * @param dir - The directory to start from, which is yielded first
 */
function* ancestorDirs(dir: string) {
	let current = path.resolve(dir);
	while (true) {
		yield current;
		const parent = path.dirname(current);
		if (parent === current) {
			return;
		}
		current = parent;
	}
}

/**
 * Whether `dir` does not exist: ENOENT, or ENOTDIR when one of its ancestors is a regular file
 * (POSIX; Windows reports that as ENOENT). Checked before cosmiconfig is asked, as its own
 * directory check takes only ENOENT for missing and throws on ENOTDIR, and as a directory it
 * never sees leaves no entry in its search cache: a configuration file created later together
 * with the directory is found without `clearExplorerCache()`.
 *
 * Any other `stat` failure (EACCES, for one) is reported like a configuration file that cannot be
 * loaded, as the walk cannot tell whether that directory holds the nearest configuration.
 *
 * @param dir - The directory to examine
 * @param filePath - The target file, named in the error report
 */
async function isMissingDir(dir: string, filePath: string) {
	try {
		await fs.stat(dir);
		return false;
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		if (error instanceof Error && 'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) {
			return true;
		}
		return cacheConfigError(dir, filePath, true)(error);
	}
}

/**
 * Searches for a configuration file in the directory of `filePath` and in each ancestor
 * directory up to the file system root, nearest first.
 *
 * The walk is done here and not by cosmiconfig's `searchStrategy: 'project'`: that strategy
 * stops at the first directory that has a `package.json`, which hides a configuration file at a
 * monorepo root from every file inside a package, while the documented behavior is that the
 * search goes upward from the target file's directory (https://markuplint.dev/docs/configuration).
 * `searchStrategy: 'global'` is no substitute: it also searches the OS-level configuration
 * directory, and that cannot be turned off.
 *
 * A directory that has a `package.json` or `package.yaml` does not end the walk: a `package.json`
 * without a `markuplint` field is not a configuration file, and a `package.yaml` never is, as it
 * is not among the search places. A directory that does not exist, the target's own included,
 * is passed over (see {@link isMissingDir}). An empty configuration is treated like no result
 * and the walk continues. A configuration file that cannot be loaded, at any level, makes the
 * search throw instead of being skipped. There is no upper bound below the file system root, so a
 * configuration file in a directory outside the project applies when nothing nearer exists.
 *
 * @template T - The type of the configuration object
 * @param filePath - The path of the target file; the search starts from its directory
 * @param cacheClear - Whether to clear the explorer's caches before searching
 * @returns The path and content of the nearest configuration file, or `null` if none was found
 */
export async function search<T = CosmiConfig>(filePath: string, cacheClear: boolean) {
	if (cacheClear) {
		explorer.clearCaches();
	}

	for (const dir of ancestorDirs(path.dirname(filePath))) {
		searchLog('Search dir: %s', dir);
		if (await isMissingDir(dir, filePath)) {
			searchLog('Missing: %s', dir);
			continue;
		}
		const result = await explorer.search(dir).catch(cacheConfigError(dir, filePath, true));

		searchLog('Search result: %O', result);

		if (!result || result.isEmpty) {
			continue;
		}
		const config = result.config as T;
		return {
			filePath: result.filepath,
			config:
				config && typeof config === 'object' && 'default' in config && typeof config.default === 'object'
					? (config.default as T)
					: config,
		};
	}

	return null;
}

export async function load<T = CosmiConfig>(filePath: string, cacheClear: boolean, referrer: string) {
	if (cacheClear) {
		explorer.clearCaches();
	}
	const result = await explorer.load(filePath).catch(cacheConfigError(filePath, referrer));
	if (!result || result.isEmpty) {
		return new ConfigLoadError('Config file is empty', filePath, referrer);
	}
	const config = result.config as T;
	return {
		filePath: result.filepath,
		config:
			config && typeof config === 'object' && 'default' in config && typeof config.default === 'object'
				? (config.default as T)
				: config,
	};
}

/**
 * Converts a failure of cosmiconfig, or of the `stat` in {@link isMissingDir}, into the error
 * markuplint reports: a `ConfigLoadError`, whatever the format of the file. A file that cannot
 * be parsed is one, YAML included, as `MLEngine` fails the target for it like for any other
 * configuration that cannot be loaded.
 *
 * cosmiconfig sets `filepath` on what a loader throws (a file that cannot be parsed or imported,
 * or whose `$import` target cannot be read, see {@link withImportCheck}; a value the
 * configuration code throws that is not an `Error` is one by then, see {@link jsLoader}). That
 * path, not `fileOrDirPath`, is the one reported: a search walks up through the ancestors of the
 * target, so the directory being searched can be far from the target, and only the path tells
 * the user which configuration file to fix. The message names it as well, as `MLEngine` shows
 * the message alone, unless cosmiconfig's JSON or YAML loader already began it with the path.
 *
 * An error without `filepath` is one cosmiconfig raises outside a loader, or one from a
 * directory that cannot be examined. Of the former, an invalid `$import` (not a string, the file
 * itself, a cycle) names the file that declares it in the message, and is reported with that path
 * (see {@link importErrorPath}); any other is reported with `fileOrDirPath`. Either keeps its own
 * message.
 *
 * When the configuration code throws, the path is followed by the location in that file nearest
 * the throw (see {@link stackLocation}), so that the user can open it at the failing statement.
 * The original error is kept as the `cause`.
 *
 * Only a fatal error that markuplint's own code raised inside a loader ({@link ownErrors}) is
 * re-thrown as it is. Every other error a loader throws comes from the user's configuration code,
 * or from parsing the user's file with `JSON.parse` or js-yaml, so a `SyntaxError` or a
 * `TypeError` there is the configuration's fault, not a broken invariant of markuplint. An error
 * without `filepath` is not guarded either: it comes from cosmiconfig or from the file system,
 * not from markuplint, and fails the target as a configuration that cannot be loaded.
 *
 * What {@link configLoadErrorFiles} returns for the error is recorded here: the file reported,
 * and the `$import` target that could not be read; nothing when a directory is reported.
 *
 * @param fileOrDirPath - The configuration file given to `load()`, or the directory being searched
 * @param referrer - The file whose configuration is being loaded
 * @param isDir - Whether `fileOrDirPath` is a directory
 * @returns A handler for the rejection, which always throws
 */
function cacheConfigError(fileOrDirPath: string, referrer: string, isDir = false) {
	return async (reason: unknown): Promise<never> => {
		if (!(reason instanceof Error) || ownErrors.has(reason)) {
			throw reason;
		}
		const filepath = 'filepath' in reason && typeof reason.filepath === 'string' ? reason.filepath : null;
		if (!filepath) {
			const declaring = importErrorPath(reason.message);
			const error = new ConfigLoadError(reason.message, declaring ?? fileOrDirPath, referrer, { cause: reason });
			filesOfErrors.set(error, declaring == null && isDir ? [] : [error.filePath]);
			throw error;
		}
		// The parser's report on the lines after the path ends with a code frame for YAML; a newline
		// keeps the ` in <referrer>` that `ConfigLoadError` appends off its last line.
		const message = isPrefixedByLoader(reason.message, filepath)
			? `${reason.message}\n`
			: `Failed to load ${filepath}${await locate(reason, filepath)}: ${reason.message}`;
		const error = new ConfigLoadError(message, filepath, referrer, { cause: reason });
		const unreadable = unreadableImports.get(reason);
		filesOfErrors.set(error, unreadable == null ? [filepath] : [unreadable, filepath]);
		throw error;
	};
}

/**
 * The files whose change can fix `error`, for a caller to watch or to list among the files a
 * configuration depends on: the file it names and, when that file's `$import` target could not
 * be read, the target, which may not exist yet. Nothing when it names a directory that a search
 * could not examine. For a `ConfigLoadError` raised elsewhere (a preset, a module), what it names.
 *
 * @param error - A `ConfigLoadError`
 * @returns The absolute paths of the files, the `$import` target first; or what `error` names
 */
export function configLoadErrorFiles(error: ConfigLoadError): readonly string[] {
	return filesOfErrors.get(error) ?? [error.filePath];
}

/**
 * Whether `message` begins as cosmiconfig's JSON and YAML loaders begin the message of the error
 * they re-throw (`JSON Error in <path>:` / `YAML Error in <path>:`). Checked as a prefix rather
 * than as any occurrence of the path, which an error that the configuration code throws can
 * contain too.
 *
 * @param message - The message of the error a loader threw
 * @param filepath - The configuration file the loader was given
 * @returns `true` when the message already names the file
 */
function isPrefixedByLoader(message: string, filepath: string) {
	return message.startsWith(`JSON Error in ${filepath}:`) || message.startsWith(`YAML Error in ${filepath}:`);
}

/**
 * The file that declares an invalid `$import`, read from the message of the error that
 * cosmiconfig's `validateImports` throws without `filepath`: `Self-import detected in <path>`,
 * `<path>: Key $import must contain a string or a list of strings`, or `Circular import
 * detected:` followed by the numbered files of the cycle, the last of which repeats an earlier
 * one, so the one before the last declares the `$import` that closes it. When cosmiconfig is
 * upgraded, compare these with its `ExplorerBase.validateImports`; a message that matches none
 * leaves the error reported with the directory or file it was loaded for. The specs of these
 * cases in `config-provider.spec.ts` run against the installed cosmiconfig, so a rewording fails
 * them.
 *
 * @param message - The message of an error without `filepath`
 * @returns The path, or `null` when the message is none of these
 */
function importErrorPath(message: string) {
	const self = /^Self-import detected in (.+)$/.exec(message);
	if (self) {
		return self[1]!;
	}
	const notString = /^(.+): Key \$import must contain a string or a list of strings$/.exec(message);
	if (notString) {
		return notString[1]!;
	}
	if (message.startsWith('Circular import detected:\n')) {
		const entries = message.split('\n').slice(1);
		return /^\d+\. (.+)$/.exec(entries.at(-2) ?? '')?.[1] ?? null;
	}
	return null;
}

/**
 * The location in `filepath` at which `error` was thrown, for {@link cacheConfigError}.
 *
 * cosmiconfig imports the real path of a JavaScript configuration file, so its frames name the
 * real path when `filepath` goes through a symbolic link; both are looked for.
 *
 * Reading `stack` can throw in Deno when source map resolution meets an invalid mapping (see
 * `MLEngine`'s `#exec`), and `realpath` can fail if the file has gone since it was loaded. Either
 * failure leaves the error named by its path alone; the error being reported is the one that
 * matters, so neither is re-thrown and neither is guarded by {@link isFatalError}. Only those two
 * are caught: a failure of {@link stackLocation} is markuplint's own.
 *
 * @param error - The error a loader threw
 * @param filepath - The configuration file the loader was given
 * @returns What {@link stackLocation} returns
 */
async function locate(error: Error, filepath: string) {
	let stack: string;
	try {
		stack = error.stack ?? '';
	} catch (stackError) {
		searchLog('Cannot read the stack of the error in %s: %O', filepath, stackError);
		return '';
	}
	// The message heads the stack, and can name the file with a line of its own.
	const header = `${error.name}: ${error.message}`;
	const frames = stack.startsWith(header) ? stack.slice(header.length) : stack;
	const realpath = await fs.realpath(filepath).catch(() => filepath);
	return stackLocation(frames, [filepath, realpath]);
}

/**
 * Finds the location nearest the top of `stack` that names one of `filePaths`, by its path (a
 * CommonJS module) or by its `file:` URL (an ES module): a frame, `<path>:<line>:<column>`, or
 * the header that Node.js puts above a `SyntaxError` in a CommonJS module, `<path>:<line>`. A
 * `SyntaxError` in an ES module has neither.
 *
 * A path only matches as a whole, at the start of a line or after whitespace or `(`, so that
 * another file whose path ends with the same characters does not.
 *
 * @param stack - The `stack` of an error
 * @param filePaths - Absolute paths of the same file
 * @returns `:<line>:<column>`, `:<line>` for a header, or an empty string when there is neither
 */
export function stackLocation(stack: string, filePaths: readonly string[]) {
	const forms = filePaths.flatMap(filePath => [filePath, pathToFileURL(filePath).href]);
	const location = new RegExp(
		String.raw`(?:^|[\s(])(?:${forms.map(form => RegExp.escape(form)).join('|')}):(\d+)(?::(\d+))?`,
		'm',
	);
	const match = location.exec(stack);
	if (!match) {
		return '';
	}
	return match[2] == null ? `:${match[1]}` : `:${match[1]}:${match[2]}`;
}
