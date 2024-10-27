import type { Log } from '../types.js';
import type { ARIAVersion } from '@markuplint/ml-spec';

import path from 'node:path';

import { Files } from 'vscode-languageserver/node.js';

export async function getModule(log: Log): Promise<Module> {
	let markuplint: any;
	let isLocalModule = false;
	let pkg: any;
	try {
		const modPath = await Files.resolve('markuplint', process.cwd(), process.cwd(), message => log(message));
		markuplint = await import(modPath);
		log(`Found package: ${modPath}`, 'debug');
		const packageJsonPath = path.resolve(path.dirname(modPath), '..', 'package.json');
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		pkg = require(packageJsonPath);
		pkg = pkg.default ?? pkg;
		isLocalModule = true;
	} catch {
		log('Failed to resolve local package', 'debug');

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
		ariaRecommendedVersion: '1.2',
	};
}

export type Module = {
	isLocalModule: boolean;
	version: string;
	moduleType: 'commonjs' | 'module';
	markuplint: any;
	ariaRecommendedVersion: ARIAVersion;
};
