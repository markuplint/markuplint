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

const parsedConfigCache = new Map<string, ts.ParsedCommandLine | null>();
const moduleResolutionCacheByConfig = new Map<string, ts.ModuleResolutionCache>();

/**
 * Clears the module-level tsconfig/module-resolution caches. Neither cache
 * expires on its own, so a long-running host (a watch-mode lint run, an
 * editor extension) that keeps calling `resolveModuleFile()` across file
 * edits must call this whenever it re-resolves without cache (e.g. after a
 * file change) — otherwise an edited `tsconfig.json` (a new `paths` alias)
 * or a newly created file that makes a previously-unresolvable specifier
 * resolvable keeps using the stale parsed config / resolution result for
 * the rest of the process's lifetime.
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

function getParsedConfig(importerDir: string): ts.ParsedCommandLine | null {
	const configPath = ts.findConfigFile(importerDir, ts.sys.fileExists);
	if (!configPath) {
		return null;
	}

	const cached = parsedConfigCache.get(configPath);
	if (cached !== undefined) {
		return cached;
	}

	const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
	const parsed = configFile.error
		? null
		: ts.parseJsonConfigFileContent(configFile.config as unknown, ts.sys, path.dirname(configPath));
	parsedConfigCache.set(configPath, parsed);
	return parsed;
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
 * @returns The normalized (`/`-delimited) absolute path of the resolved file,
 *          or `null` when resolution fails (e.g. a bare npm specifier with no
 *          matching package, or a relative specifier with no matching file).
 */
export function resolveModuleFile(importerAbsPath: string, specifier: string): string | null {
	const importerDir = path.dirname(importerAbsPath);
	const configPath = ts.findConfigFile(importerDir, ts.sys.fileExists);
	const parsedConfig = configPath ? getParsedConfig(importerDir) : null;
	const compilerOptions = parsedConfig?.options ?? DEFAULT_COMPILER_OPTIONS;
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
