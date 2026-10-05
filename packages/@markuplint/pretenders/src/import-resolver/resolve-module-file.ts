/**
 * @module resolve-module-file
 *
 * Resolves an import specifier used inside a component file to an absolute
 * file path, using the TypeScript compiler's own module resolution so that
 * relative specifiers, extension inference, `baseUrl`/`paths` aliases, and
 * `node_modules` all behave exactly as they do for the TypeScript compiler
 * itself. `tsconfig.json` discovery and parsing is cached per config file
 * path, and module resolution results are cached per compiler options set.
 *
 * TypeScript has no knowledge of `.vue`/`.svelte`/`.astro` files, so relative
 * specifiers that TypeScript fails to resolve fall back to a plain
 * filesystem-based extension search.
 */

import fs from 'node:fs';
import path from 'node:path';

import { isFatalError } from '@markuplint/shared';
import ts from 'typescript';

const TEMPLATE_EXTENSIONS = ['.vue', '.svelte', '.astro'];
const FALLBACK_EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', ...TEMPLATE_EXTENSIONS];
const FALLBACK_INDEX_NAMES = ['index.tsx', 'index.ts', 'index.jsx', 'index.js', 'index.mjs', 'index.cjs'];

const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
	allowJs: true,
	jsx: ts.JsxEmit.ReactJSX,
	moduleResolution: ts.ModuleResolutionKind.Bundler,
	module: ts.ModuleKind.ESNext,
};

type ParsedConfig = {
	readonly parsed: ts.ParsedCommandLine | null;
	/**
	 * The config file and everything it `extends`, kept with the parsed result
	 * so a cache hit can still report them (see {@link resolveModuleFile}).
	 */
	readonly files: readonly string[];
};

const parsedConfigCache = new Map<string, ParsedConfig>();
const moduleResolutionCacheByConfig = new Map<string, ts.ModuleResolutionCache>();

/**
 * Clears the module-level tsconfig/module-resolution caches. Neither cache
 * expires on its own, so a long-running host (a watch-mode lint run, an
 * editor extension) that keeps calling `resolveModuleFile()` across file
 * edits must call this whenever it re-resolves without cache (e.g. after a
 * file change) — otherwise an edited `tsconfig.json` (a new `paths` alias)
 * or a newly created file that makes a previously-unresolvable specifier
 * resolvable keeps using the stale parsed config / resolution result for
 * the rest of the process's lifetime. An edit to a `tsconfig.json` is one a
 * host can learn of from the `dependencies` of `resolveModuleFile()`; the
 * creation of a file is not (it is not there to be reported yet), so a host
 * that watches only the reported files sees it with its next full
 * re-resolution.
 */
export function clearModuleResolutionCaches() {
	parsedConfigCache.clear();
	moduleResolutionCacheByConfig.clear();
}

/**
 * Converts backslashes to `/`, regardless of the current OS.
 * TypeScript's own `sourceFile.fileName` is always slash-delimited, so all
 * paths compared against it (or emitted for cross-platform-stable output)
 * must go through this first. Using `path.sep` here would be a no-op on
 * POSIX systems even when the input path was produced on Windows.
 *
 * @param filePath - The path to normalize
 * @returns `filePath` with all backslashes replaced by forward slashes
 */
export function normalizePath(filePath: string): string {
	return filePath.split('\\').join('/');
}

/**
 * Adds `filePath` to `dependencies` (see `PretenderScanOptions#dependencies`),
 * unless it is under `node_modules`. A no-op without a sink.
 *
 * @param dependencies - The sink, if the caller wants one
 * @param filePath - The path of a file the result depends on
 */
export function recordDependency(dependencies: Set<string> | undefined, filePath: string): void {
	if (!dependencies) {
		return;
	}
	const normalized = normalizePath(filePath);
	if (!normalized.includes('/node_modules/')) {
		dependencies.add(normalized);
	}
}

function getParsedConfig(configPath: string): ParsedConfig {
	const cached = parsedConfigCache.get(configPath);
	if (cached !== undefined) {
		return cached;
	}

	const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
	let entry: ParsedConfig;
	if (configFile.error) {
		entry = { parsed: null, files: [configPath] };
	} else {
		// `parseJsonConfigFileContent` is given no source file here, so it does not
		// report `extendedSourceFiles`; the extended-config cache lists every file of
		// the `extends` chain, nested ones included. Its keys are lower-cased on a
		// case-insensitive file system, hence the files are read from the values.
		const extendedConfigCache = new Map<string, ts.ExtendedConfigCacheEntry>();
		const parsed = ts.parseJsonConfigFileContent(
			configFile.config as unknown,
			ts.sys,
			path.dirname(configPath),
			undefined,
			configPath,
			undefined,
			undefined,
			extendedConfigCache,
		);
		entry = {
			parsed,
			files: [configPath, ...[...extendedConfigCache.values()].map(extended => extended.extendedResult.fileName)],
		};
	}
	parsedConfigCache.set(configPath, entry);
	return entry;
}

function getModuleResolutionCache(configPath: string, compilerOptions: ts.CompilerOptions): ts.ModuleResolutionCache {
	let cache = moduleResolutionCacheByConfig.get(configPath);
	if (!cache) {
		cache = ts.createModuleResolutionCache(process.cwd(), s => s, compilerOptions);
		moduleResolutionCacheByConfig.set(configPath, cache);
	}
	return cache;
}

/**
 * Resolves a static import specifier found in `importerAbsPath` to an
 * absolute file path.
 *
 * @param importerAbsPath - Absolute path of the file containing the import
 * @param specifier - The module specifier text (e.g. `./Button`, `@/components/Button`)
 * @param dependencies - A sink for the `tsconfig.json` the import was resolved
 *                       with and the configs it `extends`, recorded on a cache
 *                       hit too (see `PretenderScanOptions#dependencies`)
 * @returns The normalized (`/`-delimited) absolute path of the resolved file,
 *          or `null` when resolution fails (e.g. a bare npm specifier with no
 *          matching package, or a relative specifier with no matching file).
 */
export function resolveModuleFile(
	importerAbsPath: string,
	specifier: string,
	dependencies?: Set<string>,
): string | null {
	const importerDir = path.dirname(importerAbsPath);
	const configPath = ts.findConfigFile(importerDir, ts.sys.fileExists);
	const config = configPath ? getParsedConfig(configPath) : null;
	for (const file of config?.files ?? []) {
		recordDependency(dependencies, file);
	}
	const compilerOptions = config?.parsed?.options ?? DEFAULT_COMPILER_OPTIONS;
	const cache = getModuleResolutionCache(configPath ?? '__default__', compilerOptions);

	const result = ts.resolveModuleName(specifier, importerAbsPath, compilerOptions, ts.sys, cache);
	if (result.resolvedModule) {
		return normalizePath(result.resolvedModule.resolvedFileName);
	}

	if (specifier.startsWith('.')) {
		return resolveRelativeFallback(importerDir, specifier);
	}

	return null;
}

function resolveRelativeFallback(importerDir: string, specifier: string): string | null {
	const base = path.resolve(importerDir, specifier);

	for (const ext of FALLBACK_EXTENSIONS) {
		const candidate = base + ext;
		if (isFile(candidate)) {
			return normalizePath(candidate);
		}
	}

	for (const indexName of FALLBACK_INDEX_NAMES) {
		const candidate = path.join(base, indexName);
		if (isFile(candidate)) {
			return normalizePath(candidate);
		}
	}

	for (const ext of TEMPLATE_EXTENSIONS) {
		const candidate = path.join(base, `index${ext}`);
		if (isFile(candidate)) {
			return normalizePath(candidate);
		}
	}

	return null;
}

function isFile(candidate: string): boolean {
	try {
		return fs.statSync(candidate).isFile();
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		return false;
	}
}
