import type { Log } from '../types';
import type { FromCodeFunction } from '@markuplint/esm-adapter';
import type { ARIAVersion } from '@markuplint/ml-spec';

import path from 'node:path';

import { MLEngine } from '@markuplint/esm-adapter';
import { Files } from 'vscode-languageserver/node';

export async function getModule(baseDir: string, log: Log): Promise<OldModule | Module> {
	try {
		const modPath = await Files.resolve('markuplint', process.cwd(), process.cwd(), message => log(message));
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const markuplint = require(modPath);
		const packageJsonPath = path.resolve(path.dirname(modPath), '..', 'package.json');
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const version: string = require(packageJsonPath).version;
		return {
			type: 'v1',
			isLocalModule: true,
			version,
			markuplint,
			modPath,
			ariaRecommendedVersion: '1.2',
		};
	} catch (_e) {
		try {
			require('markuplint');
		} catch (e) {
			if (e && typeof e === 'object' && 'code' in e) {
				switch (e.code) {
					case 'ERR_PACKAGE_PATH_NOT_EXPORTED': {
						if ('message' in e && typeof e.message === 'string') {
							const matched = /^No "exports" main defined in (.+)\/package\.json$/i.exec(e.message);
							log(`Found package as ESM: ${matched?.[1]}`, 'debug');
						}
					}
				}
			} else {
				throw e;
			}
		}

		await MLEngine.setModule('markuplint');
		const { modulePath, isLocalModule, version } = await MLEngine.getCurrentModuleInfo();

		log(`Markuplint path: ${modulePath} (${version})`, 'debug');

		return {
			type: 'v4',
			isLocalModule,
			version,
			fromCode: MLEngine.fromCode,
			ariaRecommendedVersion: '1.2',
		};
	}
}

export type OldModule = {
	type: 'v1';
	isLocalModule: true;
	version: string;
	markuplint: any;
	modPath: string;
	ariaRecommendedVersion: '1.2';
};

export type Module = {
	type: 'v4';
	isLocalModule: boolean;
	version: string;
	fromCode: FromCodeFunction;
	ariaRecommendedVersion: ARIAVersion;
};
