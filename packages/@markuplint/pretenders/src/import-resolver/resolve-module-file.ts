/**
 * @module resolve-module-file
 *
 * Resolves an import specifier used inside a component file to an absolute
 * file path, using the TypeScript compiler's module resolution so that
 * relative specifiers, extension inference, `paths` aliases, and
 * `node_modules` resolve as they do for the compiler. `tsconfig.json` discovery
 * and parsing is cached per config file path, and a module resolver of the
 * compiler (which holds its own resolution cache) is kept per config file path.
 *
 * What the compiler API does not give is read here instead, from the JSON of the
 * config files (`readConfigChain`): the files a config `extends`, to report them as
 * dependencies, and the directory `compilerOptions.baseUrl` names. The compiler no
 * longer resolves through `baseUrl`, so {@link resolveModuleFile} does what the
 * compiler did with it: a bare specifier is looked for below that directory, ahead of
 * `node_modules` and after `paths`. It also turns off {@link isPackageSpecifier}. A package named in
 * `extends` is found by module resolution, else by the `tsconfig.json` of the package
 * in `node_modules`; the `tsconfig` field of its `package.json` is not read. These
 * go when the API reports the files and the options itself.
 *
 * TypeScript has no knowledge of `.vue`/`.svelte`/`.astro` files, so relative
 * specifiers that TypeScript fails to resolve fall back to a plain
 * filesystem-based extension search.
 */

import type { CompilerOptions } from 'typescript/sync';

import fs from 'node:fs';
import path from 'node:path';

import { isFatalError } from '@markuplint/shared';
import { JsxEmit, ModuleKind, ModuleResolutionKind } from 'typescript/sync';

import { callTsApi, onTsApiClose, peekTsApi } from '../ts-api.js';

const TEMPLATE_EXTENSIONS = ['.vue', '.svelte', '.astro'];
const FALLBACK_EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', ...TEMPLATE_EXTENSIONS];
const FALLBACK_INDEX_NAMES = ['index.tsx', 'index.ts', 'index.jsx', 'index.js', 'index.mjs', 'index.cjs'];

const DEFAULT_COMPILER_OPTIONS: CompilerOptions = {
	allowJs: true,
	jsx: JsxEmit.ReactJSX,
	moduleResolution: ModuleResolutionKind.Bundler,
	module: ModuleKind.ESNext,
};

type TsApi = NonNullable<ReturnType<typeof peekTsApi>>;
type ParsedConfigResult = ReturnType<TsApi['parseJsonConfigFileContent']>;
type ModuleResolver = ReturnType<TsApi['createModuleResolver']>;

type ParsedConfig = {
	readonly parsed: ParsedConfigResult | null;
	/**
	 * The config file and everything it `extends`, kept with the parsed result
	 * so a cache hit can still report them (see {@link resolveModuleFile}).
	 */
	readonly files: readonly string[];
	/** The directory `compilerOptions.baseUrl` names, for the config or what it `extends` (see `readConfigChain`). */
	readonly baseUrlDir: string | undefined;
};

const parsedConfigCache = new Map<string, ParsedConfig>();
const moduleResolverByConfig = new Map<string, ModuleResolver>();

// The resolvers belong to the process that made them: when it is stopped they are gone with it.
onTsApiClose(() => {
	moduleResolverByConfig.clear();
});

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
	const resolvers = [...moduleResolverByConfig.values()];
	// Emptied before anything can fail: releasing a resolver asks the compiler process, which may have died.
	moduleResolverByConfig.clear();
	// ...and none is started for it.
	if (peekTsApi()) {
		for (const resolver of resolvers) {
			callTsApi(() => {
				resolver.dispose();
			});
		}
	}
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

/**
 * The nearest file `name` in `dir` or one of its ancestors, found by walking up the real file system.
 */
function findConfigFile(dir: string, name = 'tsconfig.json'): string | undefined {
	for (let current = path.resolve(dir); ; current = path.dirname(current)) {
		const candidate = path.join(current, name);
		if (isFile(candidate)) {
			return candidate;
		}
		if (path.dirname(current) === current) {
			return undefined;
		}
	}
}

type ConfigChain = {
	/** The config and everything it `extends`, nested ones included. */
	readonly files: readonly string[];
	/**
	 * The directory `compilerOptions.baseUrl` names, relative to the config that sets it: `undefined`
	 * when none of the configs says anything about it, and `null` when one unsets it with `null`, as it
	 * does for the compiler. A later `extends` overrides an earlier one, and the config overrides what
	 * it extends.
	 */
	readonly baseUrl: string | null | undefined;
};

/**
 * Reads the config and what it `extends`, each file once. The compiler API reports neither the
 * files nor `baseUrl`, so both come from the JSON of each file. A relative or absolute `extends` is
 * resolved as the compiler does (a missing `.json` is appended). A package one is resolved by
 * module resolution, with the resolver that `getResolver` makes once for the whole chain, and
 * otherwise by the `tsconfig.json` of the package in the `node_modules` of the config's ancestors.
 * A file that cannot be read or parsed is still listed, and contributes nothing else.
 */
function readConfigChain(
	api: TsApi,
	getResolver: () => ModuleResolver,
	configPath: string,
	seen = new Set<string>([configPath]),
	config: unknown = api.readConfigFile(configPath).config,
): ConfigChain {
	const raw = config as { extends?: unknown; compilerOptions?: Record<string, unknown> } | null;
	const files = [configPath];
	let baseUrl: string | null | undefined;
	const specifiers = (Array.isArray(raw?.extends) ? (raw.extends as unknown[]) : [raw?.extends]).filter(
		(specifier): specifier is string => typeof specifier === 'string',
	);
	for (const specifier of specifiers) {
		const resolved = resolveExtendedConfig(getResolver, path.dirname(configPath), specifier);
		if (resolved !== undefined && !seen.has(resolved)) {
			seen.add(resolved);
			const chain = readConfigChain(api, getResolver, resolved, seen);
			files.push(...chain.files);
			baseUrl = chain.baseUrl === undefined ? baseUrl : chain.baseUrl;
		}
	}
	if (raw?.compilerOptions && 'baseUrl' in raw.compilerOptions) {
		const value = raw.compilerOptions.baseUrl;
		baseUrl = typeof value === 'string' ? path.resolve(path.dirname(configPath), value) : null;
	}
	return { files, baseUrl };
}

function resolveExtendedConfig(getResolver: () => ModuleResolver, dir: string, specifier: string): string | undefined {
	if (specifier.startsWith('./') || specifier.startsWith('../') || path.isAbsolute(specifier)) {
		const base = path.resolve(dir, specifier);
		return [base, `${base}.json`].find(candidate => isFile(candidate) && candidate.endsWith('.json'));
	}
	const resolved = getResolver().resolveModuleName(specifier, dir).resolvedModule?.resolvedFileName;
	return resolved?.endsWith('.json') ? resolved : lookUpPackageConfig(dir, specifier);
}

function lookUpPackageConfig(dir: string, specifier: string): string | undefined {
	for (let current = path.resolve(dir); ; current = path.dirname(current)) {
		const base = path.join(current, 'node_modules', specifier);
		const found = [`${base}.json`, base, path.join(base, 'tsconfig.json')].find(
			candidate => isFile(candidate) && candidate.endsWith('.json'),
		);
		if (found !== undefined) {
			return found;
		}
		if (path.dirname(current) === current) {
			return undefined;
		}
	}
}

function getParsedConfig(configPath: string): ParsedConfig {
	const cached = parsedConfigCache.get(configPath);
	if (cached !== undefined) {
		return cached;
	}

	const entry = callTsApi((api): ParsedConfig => {
		const configFile = api.readConfigFile(configPath);
		if (configFile.error) {
			return { parsed: null, files: [configPath], baseUrlDir: undefined };
		}
		const parsed = api.parseJsonConfigFileContent(configFile.config as unknown, { configFileName: configPath });
		// One resolver for the packages the chain extends, made only when it has one.
		let resolver: ModuleResolver | undefined;
		const getResolver = () => {
			resolver ??= api.createModuleResolver({
				module: ModuleKind.ESNext,
				moduleResolution: ModuleResolutionKind.Bundler,
				resolveJsonModule: true,
			});
			return resolver;
		};
		try {
			const chain = readConfigChain(api, getResolver, configPath, undefined, configFile.config);
			return { parsed, files: chain.files, baseUrlDir: chain.baseUrl ?? undefined };
		} finally {
			resolver?.dispose();
		}
	});
	parsedConfigCache.set(configPath, entry);
	return entry;
}

function getModuleResolver(configPath: string, compilerOptions: CompilerOptions): ModuleResolver {
	const cached = moduleResolverByConfig.get(configPath);
	if (cached) {
		return cached;
	}
	const resolver = callTsApi(api => api.createModuleResolver(compilerOptions));
	moduleResolverByConfig.set(configPath, resolver);
	return resolver;
}

/**
 * Finds the `tsconfig.json` that governs `importerDir` and reports it, with what it `extends`,
 * to `dependencies` (a cache hit too).
 */
function loadCompilerOptions(
	importerDir: string,
	dependencies: Set<string> | undefined,
): {
	readonly configPath: string | undefined;
	readonly compilerOptions: CompilerOptions;
	readonly projectReferences: readonly unknown[] | undefined;
	readonly baseUrlDir: string | undefined;
} {
	const configPath = findConfigFile(importerDir);
	const config = configPath ? getParsedConfig(configPath) : null;
	for (const file of config?.files ?? []) {
		recordDependency(dependencies, file);
	}
	return {
		configPath,
		compilerOptions: config?.parsed?.options ?? DEFAULT_COMPILER_OPTIONS,
		projectReferences: config?.parsed?.projectReferences,
		baseUrlDir: config?.baseUrlDir,
	};
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
	const { configPath, compilerOptions, baseUrlDir } = loadCompilerOptions(importerDir, dependencies);
	const resolver = getModuleResolver(configPath ?? '__default__', compilerOptions);

	const { resolvedModule } = callTsApi(() => resolver.resolveModuleName(specifier, importerDir));
	// A file below `baseUrl` comes before a package, as it did for the compiler that applied the option;
	// what `paths` resolved to a file of the project stays.
	if (
		baseUrlDir !== undefined &&
		isBareSpecifier(specifier) &&
		(!resolvedModule || resolvedModule.isExternalLibraryImport)
	) {
		const below = callTsApi(() => resolver.resolveModuleName(`./${specifier}`, baseUrlDir)).resolvedModule;
		if (below) {
			return normalizePath(below.resolvedFileName);
		}
	}
	if (resolvedModule) {
		return normalizePath(resolvedModule.resolvedFileName);
	}

	if (specifier.startsWith('.')) {
		return resolveRelativeFallback(importerDir, specifier);
	}

	return null;
}

/** Whether the specifier is neither relative nor absolute, so a `baseUrl` is what it can be below. */
function isBareSpecifier(specifier: string): boolean {
	return !specifier.startsWith('.') && !path.isAbsolute(specifier);
}

const RE_PACKAGE_SPECIFIER = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*(?:\/.*)?$/;

/**
 * Whether `specifier`, which {@link resolveModuleFile} could not resolve, can only be a package
 * that is not installed. A specifier is taken for one when nothing could stand for it but a
 * package: it has the form of a package name (so not `@/x`, `~/x`, `#x` or `node:x`), no `paths`
 * pattern of the `tsconfig.json` matches it, and the `tsconfig.json` has no `baseUrl` (which makes
 * any bare specifier a path below it). The part of an alias that module resolution cannot follow
 * (a `.vue` file) is what stays unresolved, so these are left to the caller's fallback, as is
 * every specifier when the `tsconfig.json` only delegates (`references`) or a `jsconfig.json` is
 * near: the aliases there are not read. The name must be lower case, as npm requires of a new
 * package: a capitalized bare specifier is more likely a bundler alias than a legacy package.
 *
 * A bare alias that only a bundler knows (Vite's `resolve.alias`) is not told from a package: it
 * is taken for one, as `tsc` reports such an import as unresolved too.
 *
 * @param importerAbsPath - Absolute path of the file containing the import
 * @param specifier - The module specifier text
 * @param dependencies - A sink for the `tsconfig.json` the decision was made with (see {@link resolveModuleFile})
 * @returns `true` when the specifier can only be a package
 */
export function isPackageSpecifier(importerAbsPath: string, specifier: string, dependencies?: Set<string>): boolean {
	if (
		!RE_PACKAGE_SPECIFIER.test(specifier) ||
		specifier.split('/').some(segment => segment === '.' || segment === '..')
	) {
		return false;
	}
	const importerDir = path.dirname(importerAbsPath);
	const { compilerOptions, projectReferences, baseUrlDir } = loadCompilerOptions(importerDir, dependencies);
	// What a solution-style `tsconfig.json` (`references`) delegates to, and a `jsconfig.json`, are
	// not read by `resolveModuleFile`, so the aliases they hold cannot be ruled out.
	if (
		baseUrlDir !== undefined ||
		(projectReferences?.length ?? 0) > 0 ||
		findConfigFile(importerDir, 'jsconfig.json') !== undefined
	) {
		return false;
	}
	return !Object.keys(compilerOptions.paths ?? {}).some(pattern => matchesPathsPattern(pattern, specifier));
}

/**
 * A `paths` key is an exact specifier, or has one `*` that stands for any text
 * (https://www.typescriptlang.org/tsconfig/#paths).
 */
function matchesPathsPattern(pattern: string, specifier: string): boolean {
	const star = pattern.indexOf('*');
	if (star === -1) {
		return pattern === specifier;
	}
	const prefix = pattern.slice(0, star);
	const suffix = pattern.slice(star + 1);
	return (
		specifier.length >= prefix.length + suffix.length && specifier.startsWith(prefix) && specifier.endsWith(suffix)
	);
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
