import type { Log } from '../types.js';
import { ARIA_RECOMMENDED_VERSION, type ARIAVersion } from '@markuplint/ml-spec';

import path from 'node:path';

import { Files } from 'vscode-languageserver/node.js';

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
		markuplint = await import(modPath);
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
