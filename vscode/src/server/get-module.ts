import type { Log } from '../types.js';
import { ARIA_RECOMMENDED_VERSION, type ARIAVersion } from '@markuplint/ml-spec';

import path from 'node:path';

import { Files } from 'vscode-languageserver/node.js';

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
 * Resolve and load the markuplint module.
 *
 * Attempts to load a locally installed markuplint from the workspace first.
 * If the local module fails to load (e.g., due to import assertion incompatibility
 * on Node.js 22+), falls back to the bundled version shipped with the VS Code extension.
 *
 * @param log - Logger function for diagnostic output
 * @returns The resolved module metadata including version, type, and optional fallback reason
 */
export async function getModule(log: Log): Promise<Module> {
	let markuplint: any;
	let isLocalModule = false;
	let pkg: any;
	let fallbackReason: Module['fallbackReason'];
	try {
		log('Getting module', 'debug');
		const modPath = await fileResolve(message => log(message));
		log(`import("${modPath}")`, 'debug');
		// IMPORTANT: modPath may be a Windows absolute path (c:\...).
		// Always convert via toImportSpecifier() before passing to import() —
		// raw drive-letter paths trigger ERR_UNSUPPORTED_ESM_URL_SCHEME.
		markuplint = await import(toImportSpecifier(modPath));
		log(`Found package: ${modPath}`, 'debug');
		const packageJsonPath = path.resolve(path.dirname(modPath), '..', 'package.json');
		// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
		pkg = require(packageJsonPath);
		pkg = pkg.default ?? pkg;
		isLocalModule = true;
	} catch (error: unknown) {
		if (isImportAssertionError(error)) {
			log(`Local markuplint is incompatible with Node.js 22+ (import assertion syntax): ${error}`, 'warn');
			fallbackReason = 'import-assertion-compat';
		} else {
			log(`Failed to resolve local package: ${error}`, 'error');
		}

		try {
			markuplint = await import('markuplint');
			log('Found package: markuplint', 'debug');
			pkg = await import('markuplint/package.json', { with: { type: 'json' } }).catch(() => {
				log('Failed to resolve package: markuplint/package.json (ERR_PACKAGE_PATH_NOT_EXPORTED)', 'debug');
				// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
				const vscodePkg = require(path.resolve(__dirname, '..', 'package.json'));
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
	};
}

/**
 * Metadata for the resolved markuplint module.
 */
export type Module = {
	/** Whether the module was loaded from the workspace's local node_modules */
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

async function fileResolve(log: (message: string) => void) {
	try {
		const modPath = await Files.resolve('markuplint', process.cwd(), process.cwd(), message => log(message));
		log(`Files.resolve('markuplint', "${process.cwd()}"): ${modPath}`);
		return modPath;
	} catch (error: unknown) {
		try {
			log(`Files.resolve('markuplint', "${process.cwd()}"): ${error}`);
			const modPath = require.resolve('markuplint', { paths: [process.cwd()] });
			log(`require.resolve('markuplint'): ${modPath}`);
			return modPath;
		} catch (error: unknown) {
			log(`require.resolve('markuplint'): ${error}`);
			if (error instanceof Error && 'code' in error && error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
				const modPackageJsonPath = error.message.replace(/^No "exports" main defined in /, '');
				// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
				const pkg = require(modPackageJsonPath);
				const main =
					pkg.main ?? pkg.exports?.['.']?.import ?? pkg.exports?.['.']?.require ?? pkg.exports['.'] ?? null;
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
}
