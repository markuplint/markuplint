import type { Log } from '../types.js';
import { ARIA_RECOMMENDED_VERSION, type ARIAVersion } from '@markuplint/ml-spec';

import path from 'node:path';

import { isFatalError } from 'markuplint/suppressions';

/**
 * Convert a module path into a specifier that Node's ESM `import()` accepts.
 *
 * On Windows, raw drive-letter paths like `c:\foo` are rejected by the ESM
 * loader (`ERR_UNSUPPORTED_ESM_URL_SCHEME: Received protocol 'c:'`) because
 * the drive letter is parsed as a URL scheme. They must be converted to
 * `file://` URLs first.
 *
 * Detection is OS-independent so that POSIX CI can exercise the Windows
 * code path.
 *
 * Mirrors `packages/@markuplint/file-resolver/src/general-import.ts` —
 * keep the two in sync when adjusting Windows-path handling. Note:
 * file-resolver currently still relies on `pathToFileURL()` and carries
 * the same Windows / POSIX-absolute mismatch; tracked separately as
 * #3840 (dev / v5).
 *
 * @param modPath - A module specifier — typically the result of `Files.resolve`
 *   or `require.resolve`, which may be a bare module name (`markuplint`), a
 *   relative path (`./foo`), or an absolute path (Windows or POSIX).
 * @returns A specifier safe to pass to `import()`. Absolute paths are converted
 *   to `file://` URLs with each segment percent-encoded; bare and relative
 *   specifiers are returned unchanged. UNC paths (`\\server\share\...`) are
 *   passed through unchanged as a known limitation.
 * @see https://github.com/markuplint/markuplint/issues/3795
 * @see https://github.com/markuplint/markuplint/issues/3836
 * @see https://github.com/markuplint/markuplint/issues/3842
 * @see https://nodejs.org/api/esm.html#urls
 */
export function toImportSpecifier(modPath: string): string {
	const isWindowsAbsolute = /^[a-z]:[/\\]/i.test(modPath);
	const isPosixAbsolute = modPath.startsWith('/');
	if (!isWindowsAbsolute && !isPosixAbsolute) {
		return modPath;
	}
	// Build the `file://` URL explicitly for both branches. Node's
	// `pathToFileURL()` is intentionally avoided: on Windows it resolves a
	// POSIX-style absolute path against the *current drive* and emits
	// `file:///D:/tmp/foo` instead of `file:///tmp/foo` (#3836); on POSIX
	// it likewise mishandles Windows-style drive paths. Constructing the
	// URL ourselves keeps the function OS-independent so POSIX CI exercises
	// the Windows code path. Each segment is percent-encoded so that
	// spaces (`Program Files`), non-ASCII characters (e.g. Japanese
	// usernames), and URL-reserved characters like `#` / `?` do not get
	// reinterpreted as fragment/query delimiters by Node's URL parser.
	if (isWindowsAbsolute) {
		// The drive-letter segment (`c:`) is kept as-is to match the
		// `pathToFileURL` output shape on Windows (`file:///c:/...`).
		const [drive, ...rest] = modPath.replaceAll('\\', '/').split('/');
		const encoded = [drive, ...rest.map(segment => encodeURIComponent(segment))].join('/');
		return `file:///${encoded}`;
	}
	// POSIX absolute path. Splitting `/tmp/foo` by `/` yields `['', 'tmp',
	// 'foo']`; the leading empty element produces the `file:///` prefix
	// after `join('/')`, so the round-trip is exactly `file:///tmp/foo`.
	const segments = modPath.split('/').map(segment => encodeURIComponent(segment));
	return `file://${segments.join('/')}`;
}

/**
 * Resolve and load the markuplint module for a working directory.
 *
 * Attempts to load a markuplint installed upward from `workspace` first.
 * If the local module fails to load (not installed, or import assertion incompatibility
 * on Node.js 22+), falls back to the bundled version shipped with the VS Code extension.
 *
 * @param workspace - Absolute directory used as the resolution base
 * @param log - Logger function for diagnostic output
 * @param deps - Module system access; defaults to Node's own (injectable for tests)
 * @returns The resolved module metadata including version, type, and optional fallback reason
 */
export async function loadModule(workspace: string, log: Log, deps?: LoadDeps): Promise<Module> {
	const { resolveEntry, importModule, importBundledPackageJson, readPackageJson } = deps ?? nodeLoadDeps();
	let markuplint: any;
	let isLocalModule = false;
	let pkg: any;
	let fallbackReason: Module['fallbackReason'];
	try {
		log(`Getting module for ${workspace}`, 'debug');
		const modPath = resolveEntry(workspace, message => log(message));
		log(`import("${modPath}")`, 'debug');
		// IMPORTANT: modPath may be a Windows absolute path (c:\...).
		// Always convert via toImportSpecifier() before passing to import() —
		// raw drive-letter paths trigger ERR_UNSUPPORTED_ESM_URL_SCHEME.
		markuplint = await importModule(toImportSpecifier(modPath));
		log(`Found package: ${modPath}`, 'debug');
		const packageJsonPath = path.resolve(path.dirname(modPath), '..', 'package.json');
		pkg = readPackageJson(packageJsonPath);
		pkg = pkg.default ?? pkg;
		isLocalModule = true;
	} catch (error: unknown) {
		// Deliberately guard-less: this is the boundary to a foreign module of unknown shape, and
		// the fallback to the bundled copy must run whatever the local installation threw
		// (the import assertion SyntaxError included).
		if (isImportAssertionError(error)) {
			log(`Local markuplint is incompatible with Node.js 22+ (import assertion syntax): ${error}`, 'warn');
			fallbackReason = 'import-assertion-compat';
		} else {
			log(`Failed to resolve local package: ${error}`, 'error');
		}

		try {
			markuplint = await importModule('markuplint');
			log('Found package: markuplint', 'debug');
			pkg = await importBundledPackageJson().catch(() => {
				log('Failed to resolve package: markuplint/package.json (ERR_PACKAGE_PATH_NOT_EXPORTED)', 'debug');
				const vscodePkg = readPackageJson(path.resolve(__dirname, '..', 'package.json'));
				return {
					version: vscodePkg.dependencies.markuplint,
					type: 'module',
				};
			});
			pkg = pkg.default ?? pkg;
			log('Found package: markuplint/package.json', 'debug');
		} catch (error) {
			log('Failed to resolve package: markuplint in VS Code', 'debug');
			throw error;
		}
	}

	const version: string = pkg.version;
	const moduleType = pkg.type ?? 'commonjs';

	log(`Loaded package: markuplint@${version}(type:${moduleType})`, 'debug');

	return {
		isLocalModule,
		version,
		moduleType,
		markuplint,
		ariaRecommendedVersion: ARIA_RECOMMENDED_VERSION,
		fallbackReason,
		workspace,
	};
}

type LoadDeps = {
	readonly resolveEntry: (workspace: string, log: (message: string) => void) => string;
	readonly importModule: (specifier: string) => Promise<any>;
	readonly importBundledPackageJson: () => Promise<any>;
	readonly readPackageJson: (packageJsonPath: string) => any;
};

function nodeLoadDeps(): LoadDeps {
	return {
		resolveEntry: resolveWithRequire,
		importModule: specifier => import(specifier),
		importBundledPackageJson: () => import('markuplint/package.json', { with: { type: 'json' } }),
		readPackageJson: require,
	};
}

/**
 * Loads the markuplint module for a working directory.
 */
export type ModuleResolver = (workspace: string) => Promise<Module>;

/**
 * Create a resolver that loads the markuplint module per working directory and caches it.
 *
 * Resolution must follow the working directory rather than the workspace root: the modules a
 * config refers to (`parser` / `specs` / `plugins`) are imported by `@markuplint/file-resolver`
 * relative to the loaded markuplint installation, so a parser installed only in a sub-package
 * is reachable only when markuplint itself is loaded from that sub-package. Falling back to the
 * bundled copy there leaves the parser unreachable and the document silently undiagnosed.
 *
 * `onFirstResolve` fires once per distinct directory — the place for one-shot notices such as
 * the bundled-fallback warning — whereas callers may report per-document status freely.
 * A failed load is not cached so the next document in that directory retries.
 *
 * @param options.log - Logger function for diagnostic output
 * @param options.onFirstResolve - Called once per directory when its module is first loaded
 * @param options.load - Module loader (injectable for tests)
 * @returns A resolver keyed by the normalized absolute directory
 * @see https://github.com/markuplint/markuplint/issues/4048
 */
export function createModuleResolver(options: {
	readonly log: Log;
	readonly onFirstResolve?: (mod: Module) => void;
	readonly load?: (workspace: string, log: Log) => Promise<Module>;
}): ModuleResolver {
	const { log, onFirstResolve, load = loadModule } = options;
	const cache = new Map<string, Promise<Module>>();
	return workspace => {
		const key = path.resolve(workspace);
		const cached = cache.get(key);
		if (cached) {
			return cached;
		}
		const loading = load(key, log);
		cache.set(key, loading);
		void loading.then(
			mod => {
				try {
					onFirstResolve?.(mod);
				} catch (error: unknown) {
					if (isFatalError(error)) {
						throw error;
					}
					log(`Module notice failed for ${key}: ${error}`, 'error');
				}
			},
			() => {
				cache.delete(key);
			},
		);
		return loading;
	};
}

/**
 * Metadata for the resolved markuplint module.
 */
export type Module = {
	/** Whether the module was loaded from a node_modules found upward from `workspace` */
	isLocalModule: boolean;
	/** The semver version string of the loaded module */
	version: string;
	/** The module system type declared in package.json */
	moduleType: 'commonjs' | 'module';
	/** The loaded markuplint module exports */
	markuplint: any;
	/** The ARIA specification version recommended by the loaded module */
	ariaRecommendedVersion: ARIAVersion;
	/**
	 * Reason the local module was skipped in favor of the bundled version.
	 * Set to `'import-assertion-compat'` when the local markuplint uses
	 * `assert { type: 'json' }` syntax that was removed in Node.js 22.
	 */
	fallbackReason?: 'import-assertion-compat';
	/** The normalized absolute working directory the module was resolved for */
	readonly workspace: string;
};

/**
 * Check whether the error is a SyntaxError caused by the `assert { type: 'json' }`
 * import assertion syntax that was removed in Node.js 22.
 *
 * @param error - The caught error to inspect
 * @returns `true` if the error matches the import assertion SyntaxError pattern
 */
function isImportAssertionError(error: unknown): boolean {
	return error instanceof SyntaxError && /Unexpected identifier 'assert'/.test(error.message);
}

type RequireDeps = {
	readonly requireResolve: (name: string, options: { readonly paths: readonly string[] }) => string;
	readonly readPackageJson: (packageJsonPath: string) => any;
};

function nodeRequireDeps(): RequireDeps {
	return {
		requireResolve: (name, options) => require.resolve(name, { paths: [...options.paths] }),
		readPackageJson: require,
	};
}

/**
 * Resolve the `markuplint` entry point with Node's CommonJS resolver, walking up from `dir`.
 *
 * Resolution stays in-process: `Files.resolve` from `vscode-languageserver` forks a Node process
 * per call, which was acceptable for a single session-wide lookup but not for one lookup per
 * working directory (every opened file's directory when `workingDirectories` is unset).
 *
 * `require.resolve` rejects a package whose `exports` map has no `require` condition (markuplint
 * ships ESM only), so the entry point is then read from that `package.json` directly. The
 * resolver functions are injectable because the server bundle is CommonJS while the test runner
 * executes this file as ESM, where `require` is not defined.
 *
 * @param dir - Absolute directory to start the `node_modules` walk from
 * @param log - Logger function for diagnostic output
 * @param deps - `require.resolve` and `require` equivalents; defaults to Node's own
 * @returns The absolute path of the markuplint entry point
 */
export function resolveWithRequire(dir: string, log: (message: string) => void, deps?: RequireDeps): string {
	const { requireResolve, readPackageJson } = deps ?? nodeRequireDeps();
	try {
		const modPath = requireResolve('markuplint', { paths: [dir] });
		log(`require.resolve('markuplint', "${dir}"): ${modPath}`);
		return modPath;
	} catch (error: unknown) {
		log(`require.resolve('markuplint', "${dir}"): ${error}`);
		if (error instanceof Error && 'code' in error && error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
			const modPackageJsonPath = error.message.replace(/^No "exports" main defined in /, '');
			const pkg = readPackageJson(modPackageJsonPath);
			const main =
				pkg.main ?? pkg.exports?.['.']?.import ?? pkg.exports?.['.']?.require ?? pkg.exports?.['.'] ?? null;
			if (!main) {
				error.message = error.message + ' No main';
				throw error;
			}
			log(`require("${modPackageJsonPath}") => package.json: ${main}`);
			const modPath = path.resolve(path.dirname(modPackageJsonPath), main);
			return modPath;
		}
		throw error;
	}
}
